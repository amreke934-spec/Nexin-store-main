import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { getDbPool, initializeDatabase, getDbStatus, queryDb } from './server/db';
import { SC_STORE_DEFAULT_PRODUCTS_PAYLOAD } from './server/scProductsData';
import { sendVerificationOtpEmail } from './server/email';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Trust reverse proxy for correct IP rate-limiting
app.set('trust proxy', 1);

const SC_STORE_BASE_URL = (process.env.SC_STORE_BASE_URL && process.env.SC_STORE_BASE_URL.trim().replace(/\/+$/, '')) || 'https://sc-store.top/api/v1';
// SECURITY: Do not fallback to hardcoded production API key; use environment or store setting
const DEFAULT_API_KEY = (process.env.SC_STORE_API_KEY && process.env.SC_STORE_API_KEY.trim()) || '';

// JWT Authentication Secret
const JWT_SECRET = process.env.JWT_SECRET || 'nexen_secure_jwt_token_secret_production_2026';

// Password Hashing & Verification
export const hashPassword = async (pwd: string): Promise<string> => {
  return await bcrypt.hash(pwd, 10);
};

export const verifyPassword = async (inputPwd: string, storedHashOrPlain: string | null | undefined): Promise<boolean> => {
  if (!storedHashOrPlain) return false;
  if (storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2b$') || storedHashOrPlain.startsWith('$2y$')) {
    return await bcrypt.compare(inputPwd, storedHashOrPlain);
  }
  // Legacy migration check: If plain text matched, we should return true (and caller auto-migrates to bcrypt)
  return inputPwd === storedHashOrPlain;
};

// Rate Limiters
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // limit each IP to 25 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تم تجاوز الحد المسموح به لمحاولات تسجيل الدخول، يرجى المحاولة بعد قليل.' },
});

export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تم تجاوز الحد المسموح به لمحاولات التحقق من الرمز، يرجى المحاولة بعد 15 دقيقة.' },
});

export const ordersRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // max 30 order calls per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تم تجاوز الحد الأقصى لإرسال الطلبات في الدقيقة، يرجى الانتظار قليلاً.' },
});

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateUserToken = (user: { id: string; email: string; role?: string }): string => {
  const role = user.role || (isAdminEmail(user.email) ? 'admin' : 'customer');
  return jwt.sign(
    {
      userId: user.id,
      email: user.email.toLowerCase(),
      role,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const verifyUserToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
  } catch {
    return null;
  }
};

export const authenticateRequest = (req: Request): TokenPayload | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && (parts[0] === 'Bearer' || parts[0] === 'Token')) {
    return verifyUserToken(parts[1]);
  }
  return null;
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول كمسؤول للمتابعة (Unauthorized)' });
  }
  const isActualAdmin = user.role === 'admin' || isAdminEmail(user.email);
  if (!isActualAdmin) {
    return res.status(403).json({ error: 'مرفوض: ليس لديك صلاحيات المسؤول (Forbidden: Admin only)' });
  }
  (req as any).authUser = user;
  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول أولاً للمتابعة (Unauthorized)' });
  }
  (req as any).authUser = user;
  next();
};

// In-memory cache for API key and live products
let activeApiKeyCache: string | null = null;
let cachedLiveProducts: any = null;

// =========================================================================
// IN-MEMORY DATA STORAGE (Seamless offline/preview fallback for PostgreSQL)
// =========================================================================
export interface InMemoryUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  balance: number;
  currency: string;
  role: string;
  avatar?: string | null;
  savedPlayerIds?: Record<string, any>;
  password?: string | null;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationRecord {
  email: string;
  code: string;
  userData: {
    name: string;
    email: string;
    phone?: string | null;
    password?: string | null;
    avatar?: string | null;
  };
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const ADMIN_EMAILS = ['m74321176@gmail.com', 'amreke934@gmail.com'];
const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
};

const inMemoryUsers = new Map<string, InMemoryUser>();
const inMemoryVerifications = new Map<string, VerificationRecord>();
const inMemoryOrders = new Map<string, any>();
const inMemorySettings = new Map<string, any>();
const inMemoryWalletTransactions: any[] = [];
const inMemorySupportTickets = new Map<string, any>();

// Seed default settings
inMemorySettings.set('exchange_rate', { usd_to_syp: 15000 });

// Seed default test & admin accounts
const seedAdmin1: InMemoryUser = {
  id: 'USR-AMREKE',
  name: 'Amr Eke',
  email: 'amreke934@gmail.com',
  phone: '0988123456',
  balance: 2500000,
  currency: 'SYP',
  role: 'admin',
  savedPlayerIds: {},
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
inMemoryUsers.set(seedAdmin1.id, seedAdmin1);

const seedAdmin2: InMemoryUser = {
  id: 'USR-ADMIN',
  name: 'Store Manager',
  email: 'm74321176@gmail.com',
  phone: '0988654321',
  balance: 2500000,
  currency: 'SYP',
  role: 'admin',
  savedPlayerIds: {},
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
inMemoryUsers.set(seedAdmin2.id, seedAdmin2);

export function findInMemoryUser(idOrEmailOrPhone?: string | null): InMemoryUser | null {
  if (!idOrEmailOrPhone) return null;
  const clean = String(idOrEmailOrPhone).trim().toLowerCase();
  for (const u of inMemoryUsers.values()) {
    if (
      u.id.toLowerCase() === clean ||
      (u.email && u.email.toLowerCase() === clean) ||
      (u.phone && u.phone.trim() === clean) ||
      (u.phone && u.phone.replace(/\s+/g, '') === clean.replace(/\s+/g, ''))
    ) {
      return u;
    }
  }
  return null;
}

export const getResolvedApiKey = async (req?: Request): Promise<string> => {
  const customHeaderKey = req?.headers?.['x-api-key'] as string;
  if (customHeaderKey && customHeaderKey.trim()) {
    return customHeaderKey.trim();
  }

  if (activeApiKeyCache && activeApiKeyCache.trim()) {
    return activeApiKeyCache.trim();
  }

  try {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query('SELECT value FROM store_settings WHERE key = $1', ['sc_store_api_key']);
      if (res.rows.length > 0 && res.rows[0].value) {
        let val = res.rows[0].value;
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'string') val = parsed;
          } catch {}
        }
        if (typeof val === 'string' && val.trim()) {
          activeApiKeyCache = val.trim();
          return activeApiKeyCache;
        }
      }
    }
  } catch (err) {
    // Ignore db fetch error
  }

  return (process.env.SC_STORE_API_KEY && process.env.SC_STORE_API_KEY.trim()) || DEFAULT_API_KEY;
};

const getAuthHeaders = async (req?: Request, extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> => {
  const apiKey = await getResolvedApiKey(req);
  return {
    'X-Api-Key': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ...extraHeaders,
  };
};

// ==========================================
// 1. NEON DATABASE STATUS & MIGRATION APIS
// ==========================================

// Get DB connection status and table list
app.get('/api/db/status', async (_req: Request, res: Response) => {
  try {
    const status = getDbStatus();
    if (!status.hasConfig) {
      return res.json({
        connected: false,
        hasConfig: false,
        message: 'DATABASE_URL is not provided. Set DATABASE_URL in environment to connect to Neon PostgreSQL.',
      });
    }

    const pool = getDbPool();
    if (!pool) {
      return res.json({
        connected: false,
        hasConfig: true,
        error: status.error || 'Failed to create DB pool',
      });
    }

    // Query tables in public schema
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map((r: any) => r.table_name);

    return res.json({
      connected: true,
      hasConfig: true,
      tables,
      tablesCount: tables.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      connected: false,
      hasConfig: !!process.env.DATABASE_URL,
      error: err.message,
    });
  }
});

// Force manual schema bootstrap / push (Admin only)
app.post('/api/db/init', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await initializeDatabase();
    if (result.success) {
      return res.json({ success: true, message: result.message || 'Database schema initialized & pushed' });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. USER AUTH & PROFILE APIS (NEON POSTGRES + OTP)
// ==========================================

function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function saveVerificationRecord(record: VerificationRecord) {
  inMemoryVerifications.set(record.email.toLowerCase(), record);
  try {
    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `INSERT INTO email_verifications (email, code, user_data, expires_at, attempts, last_sent_at, created_at)
         VALUES ($1, $2, $3, TO_TIMESTAMP($4 / 1000.0), $5, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET
           code = EXCLUDED.code,
           user_data = EXCLUDED.user_data,
           expires_at = EXCLUDED.expires_at,
           attempts = EXCLUDED.attempts,
           last_sent_at = NOW();`,
        [
          record.email.toLowerCase(),
          record.code,
          JSON.stringify(record.userData),
          record.expiresAt,
          record.attempts,
        ]
      );
    }
  } catch (err: any) {
    console.warn('[DB] Could not persist email verification to PostgreSQL, using memory:', err.message);
  }
}

async function getVerificationRecord(email: string): Promise<VerificationRecord | null> {
  const clean = email.trim().toLowerCase();
  const mem = inMemoryVerifications.get(clean);
  if (mem) return mem;

  try {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query('SELECT * FROM email_verifications WHERE LOWER(email) = $1 LIMIT 1', [clean]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const record: VerificationRecord = {
          email: row.email,
          code: row.code,
          userData: typeof row.user_data === 'string' ? JSON.parse(row.user_data) : (row.user_data || {}),
          expiresAt: new Date(row.expires_at).getTime(),
          attempts: parseInt(row.attempts || '0', 10),
          lastSentAt: new Date(row.last_sent_at || row.created_at).getTime(),
        };
        inMemoryVerifications.set(clean, record);
        return record;
      }
    }
  } catch {}
  return null;
}

async function removeVerificationRecord(email: string) {
  const clean = email.trim().toLowerCase();
  inMemoryVerifications.delete(clean);
  try {
    const pool = getDbPool();
    if (pool) {
      await pool.query('DELETE FROM email_verifications WHERE LOWER(email) = $1', [clean]);
    }
  } catch {}
}

// 1. Register User & Send Instant OTP (Does NOT log in immediately)
app.post('/api/auth/register', authRateLimiter, async (req: Request, res: Response) => {
  const { name, email, phone, password, avatar } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'الاسم والبريد الإلكتروني مطلوبان' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPhone = phone ? String(phone).trim() : null;

  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صالح' });
  }

  if (password && String(password).length < 6) {
    return res.status(400).json({ error: 'يجب أن لا تقل كلمة المرور عن 6 أحرف' });
  }

  try {
    const pool = getDbPool();

    // Check if verified user exists in Postgres
    if (pool) {
      try {
        const existing = await pool.query(
          'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1',
          [cleanEmail]
        );
        if (existing.rows.length > 0) {
          const user = existing.rows[0];
          if (user.email_verified || isAdminEmail(user.email)) {
            return res.status(400).json({
              error: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى الانتقال إلى تسجيل الدخول.',
            });
          }
        }
      } catch (dbErr: any) {
        console.warn('DB check error in register:', dbErr.message);
      }
    }

    // Check if verified user exists in memory
    const existingMem = findInMemoryUser(cleanEmail);
    if (existingMem && (existingMem.emailVerified || isAdminEmail(existingMem.email))) {
      return res.status(400).json({
        error: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى الانتقال إلى تسجيل الدخول.',
      });
    }

    // Rate limit check: at least 30 seconds between OTP requests
    const prevVerif = await getVerificationRecord(cleanEmail);
    if (prevVerif && (Date.now() - prevVerif.lastSentAt) < 30000) {
      const waitSec = Math.ceil((30000 - (Date.now() - prevVerif.lastSentAt)) / 1000);
      return res.status(429).json({
        error: `تم إرسال رمز تحقق مؤخراً. يرجى الانتظار ${waitSec} ثانية أو فحص صندوق بريدك.`,
        cooldownSeconds: waitSec,
        requiresVerification: true,
        email: cleanEmail,
      });
    }

    // Generate fresh 6-digit OTP code & 10 minutes expiry
    const otpCode = generate6DigitOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Hash password securely with bcrypt before saving into verification record (never store plaintext in DB)
    const securePasswordHash = password ? await hashPassword(String(password)) : null;

    // Save verification state
    await saveVerificationRecord({
      email: cleanEmail,
      code: otpCode,
      userData: {
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        password: securePasswordHash,
        avatar: avatar || null,
      },
      expiresAt,
      attempts: 0,
      lastSentAt: Date.now(),
    });

    // Send email via Resend
    const sendResult = await sendVerificationOtpEmail(cleanEmail, otpCode, name.trim());
    if (!sendResult.success) {
      return res.status(400).json({
        error: sendResult.error || 'تعذر إرسال رمز التحقق إلى بريدك الإلكتروني. يرجى التأكد من البريد والمحاولة ثانية.',
      });
    }

    // User is NOT logged in. Frontend redirects to the verification screen.
    return res.json({
      success: true,
      requiresVerification: true,
      email: cleanEmail,
      message: 'تم إرسال رمز التحقق المكون من 6 أرقام إلى بريدك الإلكتروني بنجاح.',
      expiresInMinutes: 10,
      cooldownSeconds: 45,
    });
  } catch (err: any) {
    console.error('Error in /api/auth/register:', err);
    return res.status(500).json({ error: err.message || 'حدث خطأ أثناء معالجة التسجيل' });
  }
});

// 2. Verify OTP & Activate User
app.post('/api/auth/verify-otp', otpRateLimiter, async (req: Request, res: Response) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'البريد الإلكتروني ورمز التحقق مطلوبان' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode = String(code).trim().replace(/\s+/g, '');

  try {
    const record = await getVerificationRecord(cleanEmail);
    if (!record) {
      return res.status(400).json({
        error: 'لم يتم العثور على طلب تحقق نشط لهذا البريد. يرجى إعادة طلب رمز جديد أو التسجيل.',
      });
    }

    // Exceeded maximum attempts (5)
    if (record.attempts >= 5) {
      await removeVerificationRecord(cleanEmail);
      return res.status(400).json({
        error: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة (5 محاولات). يرجى طلب رمز جديد.',
      });
    }

    // Expiration check (10 minutes)
    if (Date.now() > record.expiresAt) {
      return res.status(400).json({
        error: 'انتهت صلاحية رمز التحقق (صالح لمدة 10 دقائق). يرجى الضغط على "إعادة إرسال الرمز".',
      });
    }

    // Code comparison
    if (record.code !== cleanCode) {
      record.attempts += 1;
      await saveVerificationRecord(record);
      const remainingAttempts = 5 - record.attempts;
      return res.status(400).json({
        error: `رمز التحقق غير صحيح. متبقي ${remainingAttempts} محاولات.`,
      });
    }

    // Code is correct! Remove verification record
    await removeVerificationRecord(cleanEmail);

    // Hash password securely with bcrypt if not already hashed
    const hashedPassword = record.userData.password
      ? (record.userData.password.startsWith('$2')
          ? record.userData.password
          : await hashPassword(record.userData.password))
      : null;

    // Create / activate user account
    let formattedUser: any = null;
    const pool = getDbPool();

    if (pool) {
      try {
        const existing = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
        if (existing.rows.length > 0) {
          const updated = await pool.query(
            `UPDATE users 
             SET email_verified = true, 
                 password_hash = COALESCE($1, password_hash),
                 updated_at = NOW() 
             WHERE LOWER(email) = $2 
             RETURNING *`,
            [hashedPassword, cleanEmail]
          );
          const u = updated.rows[0];
          formattedUser = {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            balance: parseFloat(u.balance || '0'),
            currency: 'SYP',
            role: u.role || (isAdminEmail(u.email) ? 'admin' : 'customer'),
            savedPlayerIds: u.saved_player_ids || {},
            emailVerified: true,
            createdAt: u.created_at,
          };
        } else {
          const userId = `USR-${Date.now().toString().slice(-6)}`;
          const userRole = isAdminEmail(cleanEmail) ? 'admin' : 'customer';
          const initialBal = userRole === 'admin' ? 2500000 : 0.0;

          const inserted = await pool.query(
            `INSERT INTO users (id, name, email, phone, password_hash, balance, currency, role, avatar, api_key, saved_player_ids, email_verified, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10, true, NOW(), NOW())
             RETURNING *`,
            [
              userId,
              record.userData.name,
              cleanEmail,
              record.userData.phone || null,
              hashedPassword,
              initialBal,
              'SYP',
              userRole,
              record.userData.avatar || null,
              JSON.stringify({}),
            ]
          );
          const u = inserted.rows[0];
          formattedUser = {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            balance: parseFloat(u.balance || '0'),
            currency: 'SYP',
            role: u.role || userRole,
            savedPlayerIds: u.saved_player_ids || {},
            emailVerified: true,
            createdAt: u.created_at,
          };
        }
      } catch (dbErr: any) {
        console.warn('DB activation error, using in-memory store:', dbErr.message);
      }
    }

    if (!formattedUser) {
      // In-memory fallback
      const userId = `USR-${Date.now().toString().slice(-6)}`;
      const role = isAdminEmail(cleanEmail) ? 'admin' : 'customer';
      const newUser: InMemoryUser = {
        id: userId,
        name: record.userData.name,
        email: cleanEmail,
        phone: record.userData.phone || null,
        password: hashedPassword,
        balance: role === 'admin' ? 2500000 : 0.0,
        currency: 'SYP',
        role,
        avatar: record.userData.avatar || null,
        savedPlayerIds: {},
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      inMemoryUsers.set(newUser.id, newUser);
      formattedUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        balance: newUser.balance,
        currency: 'SYP',
        role: newUser.role,
        savedPlayerIds: {},
        emailVerified: true,
        createdAt: newUser.createdAt,
      };
    } else {
      inMemoryUsers.set(formattedUser.id, {
        ...formattedUser,
        password: hashedPassword,
        updatedAt: new Date().toISOString(),
      });
    }

    // Generate JWT token
    const token = generateUserToken({
      id: formattedUser.id,
      email: formattedUser.email,
      role: formattedUser.role,
    });
    formattedUser.token = token;

    // Return authenticated user & signed token
    return res.json({
      success: true,
      verified: true,
      token,
      user: formattedUser,
      orders: [],
      message: 'تم تأكيد بريدك الإلكتروني وتفعيل حسابك بنجاح!',
    });
  } catch (err: any) {
    console.error('Error in /api/auth/verify-otp:', err);
    return res.status(500).json({ error: err.message || 'حدث خطأ أثناء التحقق من الرمز' });
  }
});

// 3. Resend OTP
app.post('/api/auth/resend-otp', otpRateLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    const record = await getVerificationRecord(cleanEmail);
    if (!record) {
      return res.status(400).json({
        error: 'لم يتم العثور على طلب تسجيل معلق لهذا البريد. يرجى إنشاء حساب جديد.',
      });
    }

    // Rate-limit check: 45 seconds cooldown
    const elapsed = Date.now() - record.lastSentAt;
    if (elapsed < 45000) {
      const waitSec = Math.ceil((45000 - elapsed) / 1000);
      return res.status(429).json({
        error: `يرجى الانتظار ${waitSec} ثانية قبل طلب رمز جديد.`,
        cooldownSeconds: waitSec,
      });
    }

    // Generate new OTP & reset expiration
    const newOtp = generate6DigitOtp();
    record.code = newOtp;
    record.expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    record.attempts = 0;
    record.lastSentAt = Date.now();

    await saveVerificationRecord(record);

    // Send email via Resend
    const sendResult = await sendVerificationOtpEmail(cleanEmail, newOtp, record.userData?.name);
    if (!sendResult.success) {
      return res.status(400).json({
        error: sendResult.error || 'تعذر إرسال رمز التحقق. يرجى المحاولة بعد قليل.',
      });
    }

    return res.json({
      success: true,
      message: 'تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني بنجاح.',
      cooldownSeconds: 45,
      expiresInMinutes: 10,
    });
  } catch (err: any) {
    console.error('Error in /api/auth/resend-otp:', err);
    return res.status(500).json({ error: err.message || 'حدث خطأ أثناء إعادة إرسال الرمز' });
  }
});

// 4. Login User (Strict Password Authentication & JWT Session)
app.post('/api/auth/login', authRateLimiter, async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  if (!identifier) {
    return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف' });
  }

  const cleanId = String(identifier).trim();
  const isEmail = cleanId.includes('@');
  const cleanEmail = isEmail ? cleanId.toLowerCase() : null;

  try {
    const pool = getDbPool();
    if (pool) {
      try {
        const userRes = await pool.query(
          `SELECT * FROM users 
           WHERE LOWER(email) = LOWER($1) 
              OR phone = $1 
              OR REPLACE(phone, ' ', '') = REPLACE($1, ' ', '')
           LIMIT 1`,
          [cleanId]
        );

        if (userRes.rows.length > 0) {
          const user = userRes.rows[0];

          // Check if email is verified (admins are exempt)
          if (user.email_verified === false && !isAdminEmail(user.email)) {
            // Trigger new OTP verification email
            const otpCode = generate6DigitOtp();
            await saveVerificationRecord({
              email: user.email.toLowerCase(),
              code: otpCode,
              userData: {
                name: user.name,
                email: user.email.toLowerCase(),
                phone: user.phone,
              },
              expiresAt: Date.now() + 10 * 60 * 1000,
              attempts: 0,
              lastSentAt: Date.now(),
            });

            await sendVerificationOtpEmail(user.email, otpCode, user.name);

            return res.status(403).json({
              success: false,
              requiresVerification: true,
              email: user.email,
              error: 'لم يتم تأكيد هذا الحساب بعد. تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني.',
            });
          }

          // SECURITY: Authenticate password strictly. Do not permit logins without password verification
          if (user.password_hash) {
            if (!password) {
              return res.status(400).json({ error: 'كلمة المرور مطلوبة لتسجيل الدخول' });
            }
            const isPasswordValid = await verifyPassword(String(password), user.password_hash);
            if (!isPasswordValid) {
              return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
            }
            // Upgrade plaintext password to bcrypt if applicable
            if (!user.password_hash.startsWith('$2')) {
              try {
                const freshHash = await hashPassword(String(password));
                await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [freshHash, user.id]);
              } catch {}
            }
          } else {
            return res.status(400).json({
              error: 'لم يتم تعيين كلمة مرور لهذا الحساب. يرجى التواصل مع الدعم الفني أو إعادة إنشاء الحساب.',
            });
          }

          const role = user.role || (isAdminEmail(user.email) ? 'admin' : 'customer');
          const token = generateUserToken({
            id: user.id,
            email: user.email,
            role,
          });

          const ordersRes = await pool.query(
            'SELECT * FROM orders WHERE user_id = $1 OR customer_email = $2 ORDER BY created_at DESC',
            [user.id, user.email]
          );

          return res.json({
            success: true,
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              balance: parseFloat(user.balance || '0'),
              currency: 'SYP',
              role,
              savedPlayerIds: user.saved_player_ids || {},
              emailVerified: true,
              createdAt: user.created_at,
              token,
            },
            orders: ordersRes.rows.map(mapDbOrderToOrderItem),
          });
        }
      } catch (dbErr: any) {
        console.warn('DB error in /api/auth/login, falling back to memory:', dbErr.message);
      }
    }

    // In-memory fallback
    let user = findInMemoryUser(cleanId);
    if (user) {
      if (user.emailVerified === false && !isAdminEmail(user.email)) {
        const otpCode = generate6DigitOtp();
        await saveVerificationRecord({
          email: user.email.toLowerCase(),
          code: otpCode,
          userData: {
            name: user.name,
            email: user.email.toLowerCase(),
            phone: user.phone,
          },
          expiresAt: Date.now() + 10 * 60 * 1000,
          attempts: 0,
          lastSentAt: Date.now(),
        });

        await sendVerificationOtpEmail(user.email, otpCode, user.name);

        return res.status(403).json({
          success: false,
          requiresVerification: true,
          email: user.email,
          error: 'لم يتم تأكيد هذا الحساب بعد. تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني.',
        });
      }

      // Verify password in-memory strictly
      if (user.password) {
        if (!password) {
          return res.status(400).json({ error: 'كلمة المرور مطلوبة لتسجيل الدخول' });
        }
        const isPasswordValid = await verifyPassword(String(password), user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
        }
      } else {
        return res.status(400).json({
          error: 'لم يتم تعيين كلمة مرور لهذا الحساب.',
        });
      }

      const role = user.role || (isAdminEmail(user.email) ? 'admin' : 'customer');
      const token = generateUserToken({
        id: user.id,
        email: user.email,
        role,
      });

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          balance: user.balance || 0,
          currency: 'SYP',
          role,
          savedPlayerIds: user.savedPlayerIds || {},
          emailVerified: true,
          createdAt: user.createdAt,
          token,
        },
        orders: [],
      });
    }

    // SECURITY: If user not found, reject request! Never auto-create unverified accounts.
    return res.status(404).json({
      success: false,
      error: 'الحساب غير مسجل في قاعدة البيانات. يرجى إنشاء حساب جديد أولاً.',
    });
  } catch (err: any) {
    console.error('Error in /api/auth/login:', err);
    return res.status(500).json({ error: err.message || 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// Update User info / Saved Game IDs (Authenticated & IDOR protected)
app.post('/api/users/save-player-id', async (req: Request, res: Response) => {
  const authUser = authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }

  const { userId, category, playerId } = req.body;

  if (!userId || !category || !playerId) {
    return res.status(400).json({ error: 'userId, category, and playerId are required' });
  }

  const isAdm = authUser.role === 'admin' || isAdminEmail(authUser.email);
  if (!isAdm && authUser.userId !== userId) {
    return res.status(403).json({ error: 'غير مصرح لك بتعديل بيانات حساب مستخدم آخر' });
  }

  try {
    const pool = getDbPool();
    if (pool) {
      try {
        await pool.query(
          `UPDATE users 
           SET saved_player_ids = COALESCE(saved_player_ids, '{}'::jsonb) || $1::jsonb,
               updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify({ [category]: playerId }), userId]
        );
      } catch (dbErr: any) {
        console.warn('DB error in /api/users/save-player-id:', dbErr.message);
      }
    }

    // Always update in memory
    const user = findInMemoryUser(userId);
    if (user) {
      user.savedPlayerIds = { ...(user.savedPlayerIds || {}), [category]: playerId };
      user.updatedAt = new Date().toISOString();
    }

    return res.json({ success: true, message: 'Saved successfully' });
  } catch (err: any) {
    console.error('Error in /api/users/save-player-id:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Fetch fresh user profile (including current balance)
app.get('/api/users/profile/:idOrEmail', async (req: Request, res: Response) => {
  try {
    const { idOrEmail } = req.params;
    const clean = decodeURIComponent(idOrEmail || '').trim();

    // Authenticate: user can only view their own profile unless admin
    const authUser = authenticateRequest(req);
    if (!authUser) {
      return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول' });
    }

    const isAdm = authUser.role === 'admin' || isAdminEmail(authUser.email);
    const isSelf = authUser.userId === clean || authUser.email.toLowerCase() === clean.toLowerCase();
    if (!isAdm && !isSelf) {
      return res.status(403).json({ error: 'مرفوض: لا يمكنك عرض بيانات مستخدم آخر' });
    }

    const pool = getDbPool();

    if (pool) {
      try {
        const result = await pool.query(
          `SELECT * FROM users WHERE id = $1 OR LOWER(email) = LOWER($1) OR phone = $1 LIMIT 1`,
          [clean]
        );

        if (result.rows.length > 0) {
          const user = result.rows[0];
          return res.json({
            success: true,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              balance: parseFloat(user.balance || '0'),
              currency: 'SYP',
              role: user.role || (isAdminEmail(user.email) ? 'admin' : 'customer'),
              savedPlayerIds: user.saved_player_ids || {},
              createdAt: user.created_at,
            },
          });
        }
      } catch (dbErr: any) {
        console.warn('DB error in profile query, falling back to memory:', dbErr.message);
      }
    }

    // In-memory fallback
    const user = findInMemoryUser(clean);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        currency: 'SYP',
        role: user.role,
        savedPlayerIds: user.savedPlayerIds || {},
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/users/profile/:idOrEmail:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. ORDERS APIS (NEON POSTGRES + SC STORE)
// ==========================================

// Get user orders from DB (Protected against IDOR)
app.get('/api/orders', async (req: Request, res: Response) => {
  const authUser = authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }

  const isAdm = authUser.role === 'admin' || isAdminEmail(authUser.email);
  // Non-admins can strictly only fetch their own orders
  const targetUserId = isAdm ? (req.query.userId ? String(req.query.userId) : null) : authUser.userId;
  const targetEmail = isAdm ? (req.query.email ? String(req.query.email).toLowerCase() : null) : authUser.email;

  try {
    const pool = getDbPool();
    if (pool) {
      try {
        let queryText = 'SELECT * FROM orders';
        const params: any[] = [];

        if (targetUserId && targetEmail) {
          queryText += ' WHERE user_id = $1 OR customer_email = $2 ORDER BY created_at DESC';
          params.push(targetUserId, targetEmail);
        } else if (targetUserId) {
          queryText += ' WHERE user_id = $1 ORDER BY created_at DESC';
          params.push(targetUserId);
        } else if (targetEmail) {
          queryText += ' WHERE customer_email = $1 ORDER BY created_at DESC';
          params.push(targetEmail);
        } else if (isAdm) {
          queryText += ' ORDER BY created_at DESC LIMIT 100';
        }

        const result = await pool.query(queryText, params);
        return res.json({ orders: result.rows.map(mapDbOrderToOrderItem) });
      } catch (dbErr: any) {
        console.warn('DB error in /api/orders, falling back to memory:', dbErr.message);
      }
    }

    // In-memory fallback
    let allOrders = Array.from(inMemoryOrders.values());
    if (targetUserId) {
      allOrders = allOrders.filter((o) => o.userId === targetUserId || o.user_id === targetUserId);
    } else if (targetEmail) {
      allOrders = allOrders.filter(
        (o) =>
          (o.customerEmail && o.customerEmail.toLowerCase() === targetEmail) ||
          (o.customer_email && o.customer_email.toLowerCase() === targetEmail)
      );
    } else if (!isAdm) {
      allOrders = [];
    }
    allOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return res.json({ orders: allOrders });
  } catch (err: any) {
    console.error('Error in GET /api/orders:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Save order into DB (Authenticated & tamper-protected)
app.post('/api/orders/save', async (req: Request, res: Response) => {
  const authUser = authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }

  const { order } = req.body;
  if (!order || !order.orderId) {
    return res.status(400).json({ error: 'Valid order object is required' });
  }

  const isAdm = authUser.role === 'admin' || isAdminEmail(authUser.email);
  // Strictly enforce user ID for non-admins to prevent forging orders for other accounts
  const effectiveUserId = isAdm ? (order.userId || authUser.userId) : authUser.userId;
  const effectiveEmail = isAdm ? (order.customerEmail || authUser.email) : authUser.email;

  try {
    // Save in memory
    const savedOrder = {
      ...order,
      id: order.id || order.orderId,
      userId: effectiveUserId,
      customerEmail: effectiveEmail,
      createdAt: order.createdAt || new Date().toISOString(),
    };
    inMemoryOrders.set(order.orderId, savedOrder);

    const pool = getDbPool();
    if (pool) {
      try {
        const query = `
          INSERT INTO orders (
            id, order_id, user_id, product_id, product_name, category, 
            qty, price, total, currency, dynamic_fields, status, 
            sc_order_id, raw_response, notes, customer_name, customer_email, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            raw_response = EXCLUDED.raw_response,
            updated_at = NOW()
          RETURNING *;
        `;

        const values = [
          String(order.id || order.orderId),
          String(order.orderId),
          effectiveUserId,
          String(order.productId || ''),
          order.productName || 'منتج رقمي',
          order.category || '',
          order.qty || 1,
          order.price || 0,
          order.total || 0,
          order.currency || 'USD',
          JSON.stringify(order.dynamicFields || {}),
          order.status || 'completed',
          String(order.scOrderId || order.orderId || ''),
          JSON.stringify(order.rawResponse || {}),
          order.notes || '',
          order.customerName || null,
          effectiveEmail,
        ];

        const result = await pool.query(query, values);
        return res.json({ success: true, orderId: result.rows[0].order_id });
      } catch (dbErr: any) {
        console.warn('DB error in /api/orders/save, stored in memory:', dbErr.message);
      }
    }

    return res.json({ success: true, orderId: order.orderId });
  } catch (err: any) {
    console.error('Error in /api/orders/save:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Clear orders from DB and in-memory cache (Protected: only admin can wipe all, users can only clear own)
app.post('/api/orders/clear', async (req: Request, res: Response) => {
  const authUser = authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول للمتابعة' });
  }

  const isAdm = authUser.role === 'admin' || isAdminEmail(authUser.email);
  const targetUserId = isAdm ? req.body?.userId : authUser.userId;
  const targetEmail = isAdm ? req.body?.email : authUser.email;

  try {
    const pool = getDbPool();
    if (pool) {
      try {
        if (targetUserId && targetEmail) {
          await pool.query('DELETE FROM orders WHERE user_id = $1 OR customer_email = $2', [String(targetUserId), String(targetEmail)]);
        } else if (targetUserId) {
          await pool.query('DELETE FROM orders WHERE user_id = $1', [String(targetUserId)]);
        } else if (targetEmail) {
          await pool.query('DELETE FROM orders WHERE customer_email = $1', [String(targetEmail)]);
        } else if (isAdm) {
          await pool.query('DELETE FROM orders');
        }
      } catch (dbErr: any) {
        console.warn('DB error in /api/orders/clear, falling back to memory:', dbErr.message);
      }
    }

    // Clear in-memory
    if (targetUserId || targetEmail) {
      for (const [id, o] of inMemoryOrders.entries()) {
        const matchUser = targetUserId && (o.userId === targetUserId || o.user_id === targetUserId);
        const matchEmail = targetEmail && ((o.customerEmail && o.customerEmail.toLowerCase() === String(targetEmail).toLowerCase()) || (o.customer_email && o.customer_email.toLowerCase() === String(targetEmail).toLowerCase()));
        if (matchUser || matchEmail) {
          inMemoryOrders.delete(id);
        }
      }
    } else if (isAdm) {
      inMemoryOrders.clear();
    }

    return res.json({ success: true, message: 'تم مسح الطلبات بنجاح' });
  } catch (err: any) {
    console.error('Error in POST /api/orders/clear:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. SETTINGS & CURRENCY APIS (NEON POSTGRES)
// ==========================================

// Get Setting (Public safe settings only, sensitive settings require admin)
app.get('/api/settings/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  const cleanKey = String(key || '').trim().toLowerCase();

  // Block unauthorized access to secret/admin settings
  const sensitiveKeywords = ['api_key', 'secret', 'token', 'password', 'sc_store_api', 'sc_sync'];
  if (sensitiveKeywords.some((kw) => cleanKey.includes(kw))) {
    const authUser = authenticateRequest(req);
    const isAdm = authUser && (authUser.role === 'admin' || isAdminEmail(authUser.email));
    if (!isAdm) {
      return res.status(403).json({ error: 'غير مصرح: هذا الإعداد محمي وخاص بالإدارة فقط' });
    }
  }

  try {
    const pool = getDbPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT value FROM store_settings WHERE key = $1', [key]);
        if (result.rows.length > 0) {
          return res.json({ key, value: result.rows[0].value });
        }
      } catch (dbErr: any) {
        console.warn(`DB error reading setting ${key}:`, dbErr.message);
      }
    }

    const val = inMemorySettings.get(key) ?? null;
    return res.json({ key, value: val });
  } catch (err: any) {
    console.error(`Error fetching setting ${key}:`, err);
    return res.status(500).json({ error: err.message });
  }
});

// Save Setting (Admin Only)
app.post('/api/settings', requireAdmin, async (req: Request, res: Response) => {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ error: 'key and value are required' });
  }

  try {
    inMemorySettings.set(key, value);

    const pool = getDbPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO store_settings (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, JSON.stringify(value)]
        );
      } catch (dbErr: any) {
        console.warn(`DB error saving setting ${key}:`, dbErr.message);
      }
    }

    return res.json({ success: true, key, value });
  } catch (err: any) {
    console.error('Error in POST /api/settings:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4.1. DEPOSIT METHODS & REQUESTS APIS
// ==========================================

const DEFAULT_DEPOSIT_METHODS = [
  {
    id: 'method_sham_cash',
    name: 'شام كاش (Sham Cash)',
    currency: 'SYP',
    exchangeRateToSyp: 1,
    depositAddress: '0988 123 456',
    minDeposit: 10000,
    maxDeposit: 5000000,
    details: '1. افتح تطبيق شام كاش على هاتفك.\n2. قم بتحويل المبلغ المطلوب إلى الرقم الموضح أعلاه باسم (متجر نيكسن ستور).\n3. بعد نجاح التحويل، أدخل رقم إشعار العملية لتأكيد وشحن رصيدك فوراً.',
    icon: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=128&auto=format&fit=crop&q=80',
    feeEnabled: false,
    feePercentage: 0,
    isActive: true,
    order: 1,
  }
];

let inMemoryDepositMethods = [...DEFAULT_DEPOSIT_METHODS];
let inMemoryDepositRequests: any[] = [];

function isRemovedDepositMethod(method: any): boolean {
  if (!method) return false;
  const id = method.id || '';
  const name = method.name || '';
  if (id === 'method_syriatel_cash' || id === 'method_usdt_trc20' || id === 'method_alharam') return true;
  if (name.includes('سيريتل كاش') || name.includes('USDT') || name.includes('الهرم')) return true;
  return false;
}

function mapDbDepositRequest(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || '',
    userEmail: row.user_email || '',
    userPhone: row.user_phone || '',
    methodId: row.method_id,
    methodName: row.method_name,
    currency: row.currency,
    exchangeRateToSyp: parseFloat(row.exchange_rate_to_syp || '1'),
    amount: parseFloat(row.amount || '0'),
    feeAmount: parseFloat(row.fee_amount || '0'),
    feePercentage: parseFloat(row.fee_percentage || '0'),
    netAmount: parseFloat(row.net_amount || '0'),
    sypAmount: parseFloat(row.syp_amount || '0'),
    txNumber: row.tx_number,
    depositAddress: row.deposit_address || '',
    notes: row.notes || '',
    status: row.status || 'pending',
    rejectionReason: row.rejection_reason || '',
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// 1. Get all deposit methods
app.get('/api/deposit-methods', async (_req: Request, res: Response) => {
  try {
    const pool = getDbPool();
    if (!pool) {
      inMemoryDepositMethods = inMemoryDepositMethods.filter((m: any) => !isRemovedDepositMethod(m));
      return res.json({ success: true, methods: inMemoryDepositMethods });
    }

    const result = await pool.query('SELECT value FROM store_settings WHERE key = $1', ['deposit_methods']);
    if (result.rows.length === 0 || !result.rows[0].value) {
      inMemoryDepositMethods = [...DEFAULT_DEPOSIT_METHODS];
      return res.json({ success: true, methods: inMemoryDepositMethods });
    }

    const rawMethods = result.rows[0].value;
    if (Array.isArray(rawMethods) && rawMethods.length > 0) {
      const filtered = rawMethods.filter((m: any) => !isRemovedDepositMethod(m));
      // If any old methods were filtered out, persist the clean array to DB
      if (filtered.length !== rawMethods.length) {
        await pool.query(
          `UPDATE store_settings SET value = $1, updated_at = NOW() WHERE key = 'deposit_methods'`,
          [JSON.stringify(filtered.length > 0 ? filtered : DEFAULT_DEPOSIT_METHODS)]
        );
      }
      inMemoryDepositMethods = filtered.length > 0 ? filtered : [...DEFAULT_DEPOSIT_METHODS];
      return res.json({ success: true, methods: inMemoryDepositMethods });
    }

    inMemoryDepositMethods = [...DEFAULT_DEPOSIT_METHODS];
    return res.json({ success: true, methods: inMemoryDepositMethods });
  } catch (err: any) {
    console.error('Error in GET /api/deposit-methods:', err);
    inMemoryDepositMethods = inMemoryDepositMethods.filter((m: any) => !isRemovedDepositMethod(m));
    return res.json({ success: true, methods: inMemoryDepositMethods });
  }
});

// 2. Save / Update deposit methods (Array or single item) (Admin only)
app.post('/api/deposit-methods', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { methods, method } = req.body;
    let updatedMethods: any[] = [];

    if (Array.isArray(methods)) {
      updatedMethods = methods;
    } else if (method && typeof method === 'object') {
      const existing = inMemoryDepositMethods;
      const index = existing.findIndex((m: any) => m.id === method.id);
      if (index >= 0) {
        existing[index] = { ...existing[index], ...method, updatedAt: new Date().toISOString() };
      } else {
        existing.push({
          ...method,
          id: method.id || `method_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      updatedMethods = existing;
    } else {
      return res.status(400).json({ error: 'methods array or method object is required' });
    }

    inMemoryDepositMethods = updatedMethods;

    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `INSERT INTO store_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        ['deposit_methods', JSON.stringify(updatedMethods)]
      );
    }

    return res.json({ success: true, methods: updatedMethods });
  } catch (err: any) {
    console.error('Error in POST /api/deposit-methods:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Delete deposit method (Admin only)
app.delete('/api/deposit-methods/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    inMemoryDepositMethods = inMemoryDepositMethods.filter((m: any) => m.id !== id);

    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `INSERT INTO store_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        ['deposit_methods', JSON.stringify(inMemoryDepositMethods)]
      );
    }

    return res.json({ success: true, methods: inMemoryDepositMethods });
  } catch (err: any) {
    console.error('Error in DELETE /api/deposit-methods/:id:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Get deposit requests (Protected: only admin can view all, users can only view their own)
app.get('/api/deposit-requests', async (req: Request, res: Response) => {
  const authUser = authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }

  const isAdm = authUser.role === 'admin' || isAdminEmail(authUser.email);
  const targetUserId = isAdm ? (req.query.userId ? String(req.query.userId) : null) : authUser.userId;
  const { status } = req.query;

  try {
    const pool = getDbPool();

    if (!pool) {
      let filtered = [...inMemoryDepositRequests];
      if (targetUserId) {
        filtered = filtered.filter((r) => r.userId === targetUserId);
      } else if (!isAdm) {
        filtered = [];
      }
      if (status) {
        filtered = filtered.filter((r) => r.status === status);
      }
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return res.json({ success: true, requests: filtered });
    }

    let queryText = 'SELECT * FROM deposit_requests WHERE 1=1';
    const queryParams: any[] = [];

    if (targetUserId) {
      queryParams.push(targetUserId);
      queryText += ` AND user_id = $${queryParams.length}`;
    } else if (!isAdm) {
      return res.json({ success: true, requests: [] });
    }

    if (status) {
      queryParams.push(String(status));
      queryText += ` AND status = $${queryParams.length}`;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await pool.query(queryText, queryParams);
    return res.json({
      success: true,
      requests: result.rows.map(mapDbDepositRequest),
    });
  } catch (err: any) {
    console.error('Error in GET /api/deposit-requests:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. Submit new deposit request (Authenticated)
app.post('/api/deposit-requests', async (req: Request, res: Response) => {
  const authUser = authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول أولاً لإرسال طلب إيداع' });
  }

  try {
    const { methodId, amount, txNumber, notes } = req.body;
    const userId = authUser.userId;

    if (!userId || !methodId || amount === undefined || !txNumber) {
      return res.status(400).json({ error: 'يرجى ملء جميع الحقول المطلوبة (طريقة الإيداع، المبلغ، ورقم العملية)' });
    }

    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'يرجى إدخال مبلغ صحيح أكبر من الصفر' });
    }

    const cleanTx = String(txNumber).trim();
    if (cleanTx.length < 3) {
      return res.status(400).json({ error: 'يرجى كتابة رقم عملية صحيح' });
    }

    // Anti-fraud: Prevent submitting duplicate transaction number that is already pending or approved
    const pool = getDbPool();
    if (pool) {
      const dupTxCheck = await pool.query(
        `SELECT id, status FROM deposit_requests WHERE LOWER(tx_number) = LOWER($1) AND status IN ('pending', 'approved') LIMIT 1`,
        [cleanTx]
      );
      if (dupTxCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'رقم العملية هذا مسجل مسبقاً في طلب إيداع آخر قيد المعالجة أو مكتمل. يرجى التأكد من رقم العملية.',
        });
      }
    } else {
      const dupMemTx = inMemoryDepositRequests.find(
        (r) => r.txNumber?.toLowerCase() === cleanTx.toLowerCase() && ['pending', 'approved'].includes(r.status)
      );
      if (dupMemTx) {
        return res.status(400).json({
          error: 'رقم العملية هذا مسجل مسبقاً في طلب إيداع آخر قيد المعالجة أو مكتمل. يرجى التأكد من رقم العملية.',
        });
      }
    }

    // Find deposit method
    let method = inMemoryDepositMethods.find((m: any) => m.id === methodId);

    if (pool) {
      const methodRes = await pool.query('SELECT value FROM store_settings WHERE key = $1', ['deposit_methods']);
      if (methodRes.rows.length > 0 && Array.isArray(methodRes.rows[0].value)) {
        const found = methodRes.rows[0].value.find((m: any) => m.id === methodId);
        if (found) method = found;
      }
    }

    if (!method) {
      return res.status(404).json({ error: 'طريقة الإيداع المحددة غير موجودة' });
    }

    // Validate min/max limits
    if (method.minDeposit !== undefined && numAmount < Number(method.minDeposit)) {
      return res.status(400).json({
        error: `أقل مبلغ يمكن إيداعه عبر ${method.name} هو ${method.minDeposit} ${method.currency}`,
      });
    }

    if (method.maxDeposit !== undefined && numAmount > Number(method.maxDeposit)) {
      return res.status(400).json({
        error: `أقصى مبلغ يمكن إيداعه عبر ${method.name} هو ${method.maxDeposit} ${method.currency}`,
      });
    }

    // Fee calculation
    const feeEnabled = !!method.feeEnabled;
    const feePercentage = feeEnabled ? (parseFloat(String(method.feePercentage)) || 0) : 0;
    const feeAmount = (numAmount * feePercentage) / 100;
    const netAmount = Math.max(0, numAmount - feeAmount);

    const methodCurr = String(method.currency || 'SYP').trim().toUpperCase();
    const isSypMethod = methodCurr === 'SYP' || methodCurr === 'ل.س' || methodCurr === 'ليرة' || methodCurr === 'SP';

    // When currency is SYP, no exchange rate is applied (amount added as is).
    // When currency is foreign, apply the payment method's base exchange rate.
    const exchangeRateToSyp = isSypMethod ? 1 : (parseFloat(String(method.exchangeRateToSyp)) || 1);
    const sypAmount = isSypMethod ? Math.round(netAmount) : Math.round(netAmount * exchangeRateToSyp);

    // Fetch user details
    let userName = 'مستخدم';
    let userEmail = authUser.email;
    let userPhone = '';

    if (pool) {
      const userRes = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
      if (userRes.rows.length > 0) {
        const u = userRes.rows[0];
        userName = u.name || userName;
        userEmail = u.email || userEmail;
        userPhone = u.phone || '';
      }
    }

    const requestId = `DEP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const nowIso = new Date().toISOString();

    const newRequest = {
      id: requestId,
      userId,
      userName,
      userEmail,
      userPhone,
      methodId,
      methodName: method.name,
      currency: method.currency || 'SYP',
      exchangeRateToSyp,
      amount: numAmount,
      feeAmount,
      feePercentage,
      netAmount,
      sypAmount,
      txNumber: cleanTx,
      depositAddress: method.depositAddress || '',
      notes: notes ? String(notes).trim() : '',
      status: 'pending',
      rejectionReason: '',
      approvedAt: null,
      approvedBy: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (pool) {
      const insertQuery = `
        INSERT INTO deposit_requests (
          id, user_id, user_name, user_email, user_phone,
          method_id, method_name, currency, exchange_rate_to_syp,
          amount, fee_amount, fee_percentage, net_amount, syp_amount,
          tx_number, deposit_address, notes, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17, $18, NOW(), NOW()
        ) RETURNING *;
      `;
      const values = [
        requestId, userId, userName, userEmail, userPhone,
        methodId, method.name, method.currency || 'SYP', exchangeRateToSyp,
        numAmount, feeAmount, feePercentage, netAmount, sypAmount,
        cleanTx, method.depositAddress || '', notes ? String(notes).trim() : '', 'pending',
      ];
      const result = await pool.query(insertQuery, values);
      return res.json({ success: true, request: mapDbDepositRequest(result.rows[0]) });
    }

    inMemoryDepositRequests.unshift(newRequest);
    return res.json({ success: true, request: newRequest });
  } catch (err: any) {
    console.error('Error in POST /api/deposit-requests:', err);
    return res.status(500).json({ error: err.message || 'فشل إرسال طلب الإيداع' });
  }
});

// 6. Admin update deposit request status (Approve & Credit Balance / Reject) (Admin only)
app.put('/api/deposit-requests/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, adminEmail } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'الحالة غير صحيحة (approved, rejected, pending)' });
    }

    const pool = getDbPool();

    if (!pool) {
      const reqIndex = inMemoryDepositRequests.findIndex((r) => r.id === id);
      if (reqIndex < 0) {
        return res.status(404).json({ error: 'طلب الإيداع غير موجود' });
      }

      const prev = inMemoryDepositRequests[reqIndex];
      const updatedReq = {
        ...prev,
        status,
        rejectionReason: rejectionReason || '',
        approvedAt: status === 'approved' ? new Date().toISOString() : prev.approvedAt,
        approvedBy: status === 'approved' ? (adminEmail || 'admin') : prev.approvedBy,
        updatedAt: new Date().toISOString(),
      };
      inMemoryDepositRequests[reqIndex] = updatedReq;

      if (status === 'approved' && prev.status !== 'approved') {
        const u = findInMemoryUser(prev.userId);
        if (u) {
          const sypToAdd = prev.sypAmount || Math.round(prev.amount || 0);
          u.balance = (u.balance || 0) + sypToAdd;
          u.updatedAt = new Date().toISOString();
        }
      }

      return res.json({ success: true, request: updatedReq });
    }

    // Query existing request
    const existingRes = await pool.query('SELECT * FROM deposit_requests WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'طلب الإيداع غير موجود' });
    }

    const depositReq = existingRes.rows[0];

    // If approving, atomically transition from 'pending' to 'approved' to prevent race-condition double credit
    if (status === 'approved') {
      const updateRes = await pool.query(
        `UPDATE deposit_requests SET
          status = 'approved',
          rejection_reason = $1,
          approved_at = NOW(),
          approved_by = $2,
          updated_at = NOW()
         WHERE id = $3 AND status = 'pending'
         RETURNING *;`,
        [rejectionReason || null, adminEmail || 'Admin', id]
      );

      if (updateRes.rows.length === 0) {
        if (depositReq.status === 'approved') {
          return res.json({ success: true, request: mapDbDepositRequest(depositReq), message: 'الطلب مقبول مسبقاً' });
        }
        return res.status(400).json({ error: 'لا يمكن اعتماد هذا الطلب لأنه لم يعد في حالة الانتظار' });
      }

      const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [depositReq.user_id]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];

        // 1. Check if deposit method currency is Syrian Pounds
        const reqCurrency = String(depositReq.currency || 'SYP').trim().toUpperCase();
        const isSyp = reqCurrency === 'SYP' || reqCurrency === 'ل.س' || reqCurrency === 'ليرة' || reqCurrency === 'SP';

        let sypToCredit = 0;
        let effectiveRate = 1;

        if (isSyp) {
          // "عند الايداع بطريقة فيها العملة ليرة سورية SYP لا يوجد أي سعر صرف حيث تتم اضافة المبلغ كما هو"
          sypToCredit = Math.round(parseFloat(depositReq.net_amount ?? depositReq.amount ?? '0'));
        } else {
          // "عند قبول طلب إيداع بجب احتساب سعر الصرف الأساسي لطريقة الدفع بحسب العملة و سعر الصرف"
          effectiveRate = parseFloat(depositReq.exchange_rate_to_syp || '0');
          if (!effectiveRate || effectiveRate <= 0) {
            try {
              const methodRes = await pool.query('SELECT value FROM store_settings WHERE key = $1', ['deposit_methods']);
              if (methodRes.rows.length > 0 && Array.isArray(methodRes.rows[0].value)) {
                const foundMethod = methodRes.rows[0].value.find((m: any) => m.id === depositReq.method_id);
                if (foundMethod && parseFloat(foundMethod.exchangeRateToSyp)) {
                  effectiveRate = parseFloat(foundMethod.exchangeRateToSyp);
                }
              }
            } catch {
              // ignore
            }
          }
          if (!effectiveRate || effectiveRate <= 0) {
            effectiveRate = await getUsdToSypRate();
          }

          const foreignAmount = parseFloat(depositReq.net_amount ?? depositReq.amount ?? '0');
          sypToCredit = Math.round(foreignAmount * effectiveRate);
        }

        sypToCredit = Math.max(0, sypToCredit);

        // "احفظ الرصيد بالليرة السورية دائماً حتى في قاعدة البيانات اجعله ليرة سورية"
        await pool.query(
          `UPDATE users 
           SET balance = COALESCE(balance, 0) + $1, 
               currency = 'SYP', 
               updated_at = NOW() 
           WHERE id = $2`,
          [sypToCredit, user.id]
        );

        // Record in wallet_transactions (always in SYP)
        const txId = `TX-${Date.now().toString().slice(-6)}`;
        await pool.query(
          `INSERT INTO wallet_transactions (id, user_id, type, amount, currency, status, payment_method, reference_id, notes, created_at)
           VALUES ($1, $2, 'deposit', $3, 'SYP', 'completed', $4, $5, $6, NOW())`,
          [
            txId,
            user.id,
            sypToCredit,
            depositReq.method_name,
            depositReq.id,
            isSyp
              ? `إيداع معتمد: ${sypToCredit.toLocaleString()} ل.س (رقم العملية: ${depositReq.tx_number})`
              : `إيداع معتمد: ${depositReq.amount} ${depositReq.currency} بسعر صرف ${effectiveRate} = ${sypToCredit.toLocaleString()} ل.س (رقم العملية: ${depositReq.tx_number})`,
          ]
        );
      }

      return res.json({
        success: true,
        request: mapDbDepositRequest(updateRes.rows[0]),
      });
    }

    // If rejecting
    const rejectRes = await pool.query(
      `UPDATE deposit_requests SET
        status = $1,
        rejection_reason = $2,
        updated_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *;`,
      [status, rejectionReason || null, id]
    );

    if (rejectRes.rows.length === 0) {
      return res.status(400).json({ error: 'لا يمكن رفض هذا الطلب لأنه لم يعد في حالة الانتظار' });
    }

    return res.json({
      success: true,
      request: mapDbDepositRequest(rejectRes.rows[0]),
    });
  } catch (err: any) {
    console.error('Error in PUT /api/deposit-requests/:id/status:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4.4. SUPPORT TICKETS & REPORT PROBLEM APIS
// ==========================================

function mapDbSupportTicket(row: any) {
  let cleanRepliedBy = row.replied_by || null;
  if (
    cleanRepliedBy &&
    (cleanRepliedBy.includes('m74321176') ||
      cleanRepliedBy.includes('محمد جعفر') ||
      cleanRepliedBy.includes('@'))
  ) {
    cleanRepliedBy = 'فريق الدعم الفني | Nexen Support';
  } else if (!cleanRepliedBy && row.admin_reply) {
    cleanRepliedBy = 'فريق الدعم الفني | Nexen Support';
  }

  let imagesList: string[] = [];
  if (Array.isArray(row.images)) {
    imagesList = row.images;
  } else if (typeof row.images === 'string') {
    try {
      const parsed = JSON.parse(row.images);
      if (Array.isArray(parsed)) imagesList = parsed;
    } catch {
      imagesList = [];
    }
  }

  return {
    id: row.id,
    userId: row.user_id || null,
    userName: row.user_name || '',
    userEmail: row.user_email || '',
    userPhone: row.user_phone || null,
    subject: row.subject || '',
    category: row.category || 'other',
    message: row.message || '',
    images: imagesList,
    status: row.status || 'pending',
    priority: row.priority || 'normal',
    adminReply: row.admin_reply || null,
    repliedAt: row.replied_at || null,
    repliedBy: cleanRepliedBy,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// 1. Create a new support ticket / issue report
app.post('/api/support/tickets', async (req: Request, res: Response) => {
  try {
    const authUser = authenticateRequest(req);
    const { userId, userName, userEmail, userPhone, subject, category, message, priority, images } = req.body || {};

    const effectiveUserId = authUser ? authUser.userId : (userId || null);
    const effectiveEmail = authUser ? authUser.email : (userEmail ? String(userEmail).trim().toLowerCase() : '');

    if (!userName || !userName.trim()) {
      return res.status(400).json({ error: 'الاسم مطلوب' });
    }
    if (!effectiveEmail) {
      return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'عنوان المشكلة مطلوب' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'تفاصيل المشكلة مطلوبة' });
    }

    const cleanSubject = subject.trim().slice(0, 200);
    const cleanMessage = message.trim().slice(0, 5000);

    const ticketId = `TKT-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    // Security: Filter images with maximum 5MB size per image and max 5 images
    const ticketImages: string[] = Array.isArray(images)
      ? images
          .filter((img) => typeof img === 'string' && img.trim().length > 0 && img.length <= 5 * 1024 * 1024)
          .slice(0, 5)
      : [];

    const newTicket = {
      id: ticketId,
      userId: effectiveUserId,
      userName: userName.trim().slice(0, 100),
      userEmail: effectiveEmail.slice(0, 100),
      userPhone: userPhone ? String(userPhone).trim().slice(0, 30) : null,
      subject: cleanSubject,
      category: category ? String(category).slice(0, 50) : 'other',
      message: cleanMessage,
      images: ticketImages,
      status: 'pending',
      priority: priority || 'normal',
      adminReply: null,
      repliedAt: null,
      repliedBy: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Store in-memory
    inMemorySupportTickets.set(ticketId, newTicket);

    // Save to PostgreSQL if available
    const pool = getDbPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO support_tickets (
            id, user_id, user_name, user_email, user_phone, 
            subject, category, message, images, status, priority, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            message = EXCLUDED.message,
            images = EXCLUDED.images,
            updated_at = NOW()`,
          [
            ticketId,
            effectiveUserId,
            userName.trim(),
            effectiveEmail,
            userPhone ? String(userPhone).trim() : null,
            subject.trim(),
            category || 'other',
            message.trim(),
            JSON.stringify(ticketImages),
            'pending',
            priority || 'normal',
          ]
        );
      } catch (dbErr: any) {
        console.warn('DB insert error for support ticket, stored in memory:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      ticket: newTicket,
      message: 'تم إرسال بلاغك بنجاح! سيتم مراجعته والرد عليه من قبل الإدارة في أقرب وقت.',
    });
  } catch (err: any) {
    console.error('Error in POST /api/support/tickets:', err);
    return res.status(500).json({ error: err.message || 'حدث خطأ أثناء إرسال البلاغ' });
  }
});

// 2. Get tickets (with user filter or all tickets for admin)
app.get('/api/support/tickets', async (req: Request, res: Response) => {
  const authUser = authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }

  const isAdm = authUser.role === 'admin' || isAdminEmail(authUser.email);
  const targetUserId = isAdm ? (req.query.userId ? String(req.query.userId) : null) : authUser.userId;
  const targetEmail = isAdm ? (req.query.userEmail ? String(req.query.userEmail).trim().toLowerCase() : null) : authUser.email;

  try {
    const pool = getDbPool();

    if (pool) {
      try {
        let query = 'SELECT * FROM support_tickets';
        const params: any[] = [];

        if (!isAdm) {
          query += ' WHERE user_id = $1 OR LOWER(user_email) = LOWER($2)';
          params.push(targetUserId, targetEmail);
        } else if (targetUserId && targetEmail) {
          query += ' WHERE user_id = $1 OR LOWER(user_email) = LOWER($2)';
          params.push(targetUserId, targetEmail);
        } else if (targetUserId) {
          query += ' WHERE user_id = $1';
          params.push(targetUserId);
        } else if (targetEmail) {
          query += ' WHERE LOWER(user_email) = LOWER($1)';
          params.push(targetEmail);
        }

        query += ' ORDER BY created_at DESC';

        const dbRes = await pool.query(query, params);
        const tickets = dbRes.rows.map(mapDbSupportTicket);
        return res.json({ success: true, tickets });
      } catch (dbErr: any) {
        console.warn('DB select error for support tickets, serving in-memory:', dbErr.message);
      }
    }

    // In-memory fallback
    let tickets = Array.from(inMemorySupportTickets.values());
    if (!isAdm) {
      tickets = tickets.filter((t) => {
        if (targetUserId && t.userId === targetUserId) return true;
        if (targetEmail && t.userEmail && t.userEmail.toLowerCase() === targetEmail) return true;
        return false;
      });
    } else {
      if (targetUserId) tickets = tickets.filter((t) => t.userId === targetUserId);
      if (targetEmail) tickets = tickets.filter((t) => t.userEmail && t.userEmail.toLowerCase() === targetEmail);
    }

    tickets = tickets.map((t) => {
      let cleanRep = t.repliedBy;
      if (
        !cleanRep ||
        cleanRep.includes('m74321176') ||
        cleanRep.includes('محمد جعفر') ||
        cleanRep.includes('@')
      ) {
        cleanRep = t.adminReply ? 'فريق الدعم الفني | Nexen Support' : null;
      }
      return { ...t, repliedBy: cleanRep };
    });

    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ success: true, tickets });
  } catch (err: any) {
    console.error('Error in GET /api/support/tickets:', err);
    return res.status(500).json({ error: err.message || 'حدث خطأ أثناء جلب البلاغات' });
  }
});

// 3. Admin: Reply to a ticket
app.post('/api/support/tickets/:id/reply', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adminReply, status, adminEmail } = req.body || {};

    if (!adminReply || !adminReply.trim()) {
      return res.status(400).json({ error: 'نص الرد مطلوب' });
    }

    const replyText = adminReply.trim();
    const newStatus = status || 'resolved';
    let cleanRepliedBy = 'فريق الدعم الفني | Nexen Support';
    if (
      adminEmail &&
      !adminEmail.includes('m74321176') &&
      !adminEmail.includes('محمد جعفر') &&
      !adminEmail.includes('@')
    ) {
      cleanRepliedBy = adminEmail.trim();
    }
    const repliedBy = cleanRepliedBy;
    const nowIso = new Date().toISOString();

    // Update in-memory
    let updatedTicket = inMemorySupportTickets.get(id);
    if (updatedTicket) {
      updatedTicket.adminReply = replyText;
      updatedTicket.status = newStatus;
      updatedTicket.repliedAt = nowIso;
      updatedTicket.repliedBy = repliedBy;
      updatedTicket.updatedAt = nowIso;
      inMemorySupportTickets.set(id, updatedTicket);
    }

    // Update PostgreSQL
    const pool = getDbPool();
    if (pool) {
      try {
        const dbRes = await pool.query(
          `UPDATE support_tickets 
           SET admin_reply = $1, 
               status = $2, 
               replied_at = NOW(), 
               replied_by = $3, 
               updated_at = NOW() 
           WHERE id = $4 
           RETURNING *;`,
          [replyText, newStatus, repliedBy, id]
        );
        if (dbRes.rows.length > 0) {
          updatedTicket = mapDbSupportTicket(dbRes.rows[0]);
        }
      } catch (dbErr: any) {
        console.warn('DB update error for support ticket reply:', dbErr.message);
      }
    }

    if (!updatedTicket) {
      return res.status(404).json({ error: 'البلاغ غير موجود' });
    }

    return res.json({
      success: true,
      ticket: updatedTicket,
      message: 'تم إرسال الرد بنجاح!',
    });
  } catch (err: any) {
    console.error('Error in POST /api/support/tickets/:id/reply:', err);
    return res.status(500).json({ error: err.message || 'حدث خطأ أثناء إرسال الرد' });
  }
});

// 4. Admin: Update ticket status
app.patch('/api/support/tickets/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({ error: 'الحالة مطلوبة' });
    }

    const nowIso = new Date().toISOString();
    let updatedTicket = inMemorySupportTickets.get(id);
    if (updatedTicket) {
      updatedTicket.status = status;
      updatedTicket.updatedAt = nowIso;
      inMemorySupportTickets.set(id, updatedTicket);
    }

    const pool = getDbPool();
    if (pool) {
      try {
        const dbRes = await pool.query(
          `UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`,
          [status, id]
        );
        if (dbRes.rows.length > 0) {
          updatedTicket = mapDbSupportTicket(dbRes.rows[0]);
        }
      } catch (dbErr: any) {
        console.warn('DB update status error for support ticket:', dbErr.message);
      }
    }

    if (!updatedTicket) {
      return res.status(404).json({ error: 'البلاغ غير موجود' });
    }

    return res.json({ success: true, ticket: updatedTicket });
  } catch (err: any) {
    console.error('Error in PATCH /api/support/tickets/:id/status:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. Admin: Delete a ticket
app.delete('/api/support/tickets/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    inMemorySupportTickets.delete(id);

    const pool = getDbPool();
    if (pool) {
      try {
        await pool.query('DELETE FROM support_tickets WHERE id = $1', [id]);
      } catch (dbErr: any) {
        console.warn('DB delete error for support ticket:', dbErr.message);
      }
    }

    return res.json({ success: true, message: 'تم حذف البلاغ بنجاح' });
  } catch (err: any) {
    console.error('Error in DELETE /api/support/tickets/:id:', err);
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 4.5. ADMIN DASHBOARD, USERS & STATS APIS
// ==========================================

// 1. Admin Stats & Analytics
app.get('/api/admin/stats', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const pool = getDbPool();
    if (!pool) {
      return res.json({
        totalUsers: 0,
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        failedOrders: 0,
        refundedOrders: 0,
        totalRevenueUsd: 0,
        totalUsersBalance: 0,
        recentOrders: [],
      });
    }

    // Query User Count and Total Balance
    const usersStat = await pool.query(`
      SELECT 
        COUNT(*)::int as count,
        COALESCE(SUM(balance), 0)::numeric as total_balance
      FROM users;
    `);

    // Query Orders Stats
    const ordersStat = await pool.query(`
      SELECT 
        COUNT(*)::int as total_orders,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed_orders,
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing'))::int as pending_orders,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed_orders,
        COUNT(*) FILTER (WHERE status = 'refunded')::int as refunded_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0)::numeric as total_revenue
      FROM orders;
    `);

    // Query 15 Most Recent Orders with user info
    const recentOrdersRes = await pool.query(`
      SELECT * FROM orders 
      ORDER BY created_at DESC 
      LIMIT 15;
    `);

    const usersCount = usersStat.rows[0]?.count || 0;
    const totalUsersBalance = parseFloat(usersStat.rows[0]?.total_balance || '0');
    const orderData = ordersStat.rows[0] || {};

    return res.json({
      totalUsers: usersCount,
      totalOrders: orderData.total_orders || 0,
      completedOrders: orderData.completed_orders || 0,
      pendingOrders: orderData.pending_orders || 0,
      failedOrders: orderData.failed_orders || 0,
      refundedOrders: orderData.refunded_orders || 0,
      totalRevenueUsd: parseFloat(orderData.total_revenue || '0'),
      totalUsersBalance,
      recentOrders: recentOrdersRes.rows.map(mapDbOrderToOrderItem),
    });
  } catch (err: any) {
    console.warn('Warning in /api/admin/stats, serving fallback stats:', err.message);
    return res.json({
      totalUsers: 0,
      totalOrders: 0,
      completedOrders: 0,
      pendingOrders: 0,
      failedOrders: 0,
      refundedOrders: 0,
      totalRevenueUsd: 0,
      totalUsersBalance: 0,
      recentOrders: [],
    });
  }
});

// 2. Admin: Get all registered users with their details and order count
app.get('/api/admin/users', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const pool = getDbPool();
    if (!pool) {
      return res.json({
        users: [],
      });
    }

    const usersResult = await pool.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.phone, 
        u.balance, 
        u.currency, 
        u.role, 
        u.avatar, 
        u.saved_player_ids,
        u.created_at, 
        u.updated_at,
        COUNT(o.id)::int as orders_count,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total ELSE 0 END), 0)::numeric as total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id OR o.customer_email = u.email
      GROUP BY u.id
      ORDER BY u.created_at DESC;
    `);

    const users = usersResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      balance: parseFloat(row.balance || '0'),
      currency: 'SYP',
      role: row.role || 'customer',
      avatar: row.avatar,
      savedPlayerIds: row.saved_player_ids || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ordersCount: row.orders_count || 0,
      totalSpent: parseFloat(row.total_spent || '0'),
    }));

    return res.json({ users });
  } catch (err: any) {
    console.warn('Warning in GET /api/admin/users, serving empty users array:', err.message);
    return res.json({
      users: [],
    });
  }
});

// 3. Admin: Update user details (Full Edit: Name, Email, Phone, Balance, Role, Password)
app.put('/api/admin/users/:userId', requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, email, phone, balance, role, password } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const pool = getDbPool();
    if (!pool) {
      return res.json({
        success: true,
        user: { id: userId, name, email, phone, balance, currency: 'SYP', role },
      });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(String(name).trim());
    }
    if (email !== undefined) {
      updates.push(`email = $${idx++}`);
      values.push(String(email).trim().toLowerCase());
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone ? String(phone).trim() : null);
    }
    if (balance !== undefined) {
      const numBalance = parseFloat(String(balance)) || 0.0;
      updates.push(`balance = $${idx++}`);
      values.push(numBalance);
    }
    if (role !== undefined) {
      updates.push(`role = $${idx++}`);
      values.push(String(role).trim());
    }
    if (password) {
      const hashedPassword = await hashPassword(String(password));
      updates.push(`password_hash = $${idx++}`);
      values.push(hashedPassword);
    }

    // Always ensure currency is SYP in database
    updates.push(`currency = 'SYP'`);
    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];

    // If balance was modified by admin, log a wallet transaction
    if (balance !== undefined) {
      try {
        const txId = `TX-${Date.now().toString().slice(-6)}`;
        await pool.query(
          `INSERT INTO wallet_transactions (id, user_id, type, amount, currency, status, payment_method, reference_id, notes, created_at)
           VALUES ($1, $2, 'adjustment', $3, 'SYP', 'completed', 'Admin Panel', $4, $5, NOW())`,
          [
            txId,
            userId,
            parseFloat(String(balance)) || 0.0,
            `ADM-${Date.now().toString().slice(-4)}`,
            `تعديل رصيد يدوي من الإدارة: ${parseFloat(String(balance)) || 0.0} ل.س`,
          ]
        );
      } catch (txErr: any) {
        console.warn('Could not record admin adjustment tx:', txErr.message);
      }
    }

    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        balance: parseFloat(updatedUser.balance || '0'),
        currency: 'SYP',
        role: updatedUser.role || 'customer',
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (err: any) {
    console.error('Error in PUT /api/admin/users/:userId:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Admin: Delete a user
app.delete(['/api/admin/users/:userId', '/api/users/:userId'], requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Clean up from memory map if present
    inMemoryUsers.delete(userId);
    for (const [key, val] of inMemoryUsers.entries()) {
      if (val.id === userId || val.email === userId) {
        inMemoryUsers.delete(key);
      }
    }

    const pool = getDbPool();
    if (!pool) {
      return res.json({ success: true, message: 'Deleted from memory' });
    }

    // Clean up dependent records safely so foreign key or orphaned constraints never block deletion
    await pool.query('DELETE FROM saved_game_ids WHERE user_id = $1', [userId]).catch(() => null);
    await pool.query('DELETE FROM wallet_transactions WHERE user_id = $1', [userId]).catch(() => null);
    await pool.query('DELETE FROM deposit_requests WHERE user_id = $1', [userId]).catch(() => null);
    await pool.query('UPDATE orders SET user_id = NULL WHERE user_id = $1', [userId]).catch(() => null);

    const deleteRes = await pool.query('DELETE FROM users WHERE id = $1 OR email = $1 RETURNING id', [userId]);
    return res.json({ 
      success: true, 
      message: 'تم حذف المستخدم بنجاح',
      deletedId: deleteRes.rows[0]?.id || userId 
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/admin/users/:userId:', err);
    return res.status(500).json({ error: err.message || 'فشل حذف المستخدم من قاعدة البيانات' });
  }
});

// 5. Admin: Create a new user manually
app.post('/api/admin/users/create', requireAdmin, async (req: Request, res: Response) => {
  const { name, email, phone, balance, role, password } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'الاسم والبريد الإلكتروني مطلوبان' });
  }

  try {
    const pool = getDbPool();
    const userId = `USR-${Date.now().toString().slice(-6)}`;
    const userBalance = parseFloat(String(balance)) || 0.0;
    const userRole = role || 'customer';
    const hashedPassword = password ? await hashPassword(String(password)) : null;

    if (!pool) {
      return res.json({
        success: true,
        user: {
          id: userId,
          name,
          email: email.trim().toLowerCase(),
          phone,
          balance: userBalance,
          currency: 'SYP',
          role: userRole,
          createdAt: new Date().toISOString(),
        },
      });
    }

    const insertRes = await pool.query(
      `INSERT INTO users (id, name, email, phone, balance, currency, role, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *;`,
      [userId, name.trim(), email.trim().toLowerCase(), phone || null, userBalance, 'SYP', userRole, hashedPassword]
    );

    const user = insertRes.rows[0];
    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: parseFloat(user.balance || '0'),
        currency: 'SYP',
        role: user.role || 'customer',
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/users/create:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 6. Admin: Detailed Order Check (DB + SC Store Live)
app.get('/api/admin/order-check/:orderId', requireAdmin, async (req: Request, res: Response) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const pool = getDbPool();
    let dbOrder: any = null;

    if (pool) {
      const dbRes = await pool.query(
        'SELECT * FROM orders WHERE order_id = $1 OR sc_order_id = $1 OR id = $1 LIMIT 1',
        [orderId]
      );
      if (dbRes.rows.length > 0) {
        dbOrder = mapDbOrderToOrderItem(dbRes.rows[0]);
      }
    }

    // Also query SC Store API in real-time
    let scData: any = null;
    let scError: string | null = null;

    try {
      const authHeaders = await getAuthHeaders(req);
      const scResponse = await fetch(`${SC_STORE_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers: authHeaders,
      });
      scData = await scResponse.json().catch(() => null);
      if (!scResponse.ok) {
        scError = scData?.message || scData?.error || `SC Store API error status ${scResponse.status}`;
      }
    } catch (e: any) {
      scError = e.message;
    }

    return res.json({
      orderId,
      foundInDb: !!dbOrder,
      dbOrder,
      scData,
      scError,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/order-check/:orderId:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. SC STORE ORIGINAL PROXY APIS
// ==========================================

// 0. Proxy for SC Store icons (/api/icons/game-charge/:id, etc.) - Hardened against SSRF & Traversal
app.get('/api/icons/*', async (req: Request, res: Response) => {
  try {
    const rawPath = req.params[0] || '';
    if (!rawPath || rawPath.includes('..') || rawPath.includes('://') || rawPath.includes('@') || !/^[a-zA-Z0-9_\-\.\/]+$/.test(rawPath)) {
      return res.status(400).end();
    }

    const cleanPath = rawPath.replace(/^\/+/, '');
    const targetUrl = `https://sc-store.top/api/icons/${cleanPath}`;
    const scRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://sc-store.top/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!scRes.ok) {
      return res.status(scRes.status).end();
    }

    const contentType = scRes.headers.get('content-type') || 'image/jpeg';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return res.status(403).end();
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await scRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(500).end();
  }
});

// 0.1 Proxy for SC Store logos (/logos/mtn.png, /logos/game-charge.png, etc.) - Hardened
app.get('/logos/*', async (req: Request, res: Response) => {
  try {
    const rawPath = req.params[0] || '';
    if (!rawPath || rawPath.includes('..') || rawPath.includes('://') || rawPath.includes('@') || !/^[a-zA-Z0-9_\-\.\/]+$/.test(rawPath)) {
      return res.status(400).end();
    }

    const cleanPath = rawPath.replace(/^\/+/, '');
    const targetUrl = `https://sc-store.top/logos/${cleanPath}`;
    const scRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://sc-store.top/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!scRes.ok) {
      return res.status(scRes.status).end();
    }

    const contentType = scRes.headers.get('content-type') || 'image/png';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return res.status(403).end();
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await scRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(500).end();
  }
});

// 0.5. API Key Management Endpoints (Admin only)
app.get('/api/sc/api-key', requireAdmin, async (req: Request, res: Response) => {
  try {
    const activeKey = await getResolvedApiKey(req);
    const isDefault = activeKey === DEFAULT_API_KEY;
    const masked = activeKey
      ? `${activeKey.substring(0, 6)}••••••••••••${activeKey.substring(activeKey.length - 4)}`
      : 'غير متوفر';

    return res.json({
      hasCustomKey: !isDefault && !!activeKey,
      isDefault,
      maskedKey: masked,
      keyLength: activeKey ? activeKey.length : 0,
      prefix: activeKey ? activeKey.substring(0, 7) : '',
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/sc/api-key', requireAdmin, async (req: Request, res: Response) => {
  const { apiKey } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    return res.status(400).json({ success: false, message: 'مفتاح API مطلوب ولا يمكن تركه فارغاً' });
  }

  const cleanKey = apiKey.trim();

  try {
    // Test live key against SC Store /me endpoint
    const testResponse = await fetch(`${SC_STORE_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'X-Api-Key': cleanKey,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const testData = await testResponse.json().catch(() => null);

    if (!testResponse.ok || (testData && testData.error)) {
      const errMsg = testData?.message || `مفتاح API غير صالح أو معطّل (كود: ${testResponse.status})`;
      return res.status(testResponse.status || 400).json({
        success: false,
        status: testResponse.status,
        message: errMsg,
        detail: 'تأكد من نسخ المفتاح كاملاً من لوحة تحكم حسابك في sc-store.top',
      });
    }

    // Key is valid! Save in DB and update cache
    activeApiKeyCache = cleanKey;
    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `INSERT INTO store_settings (key, value, updated_at)
         VALUES ('sc_store_api_key', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(cleanKey)]
      );
    }

    // Fetch and cache fresh live products immediately
    try {
      const prodRes = await fetch(`${SC_STORE_BASE_URL}/products`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'X-Api-Key': cleanKey,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      const prodData = await prodRes.json().catch(() => null);
      if (prodRes.ok && prodData && !prodData.error && prodData.products) {
        cachedLiveProducts = prodData;
      }
    } catch {}

    const masked = `${cleanKey.substring(0, 6)}••••••••••••${cleanKey.substring(cleanKey.length - 4)}`;

    return res.json({
      success: true,
      message: 'تم التحقق من مفتاح API وتفعيله بنجاح!',
      maskedKey: masked,
      merchant: testData?.user || testData?.data || testData,
    });
  } catch (err: any) {
    console.error('Error validating API key:', err);
    return res.status(500).json({ success: false, message: err.message || 'فشل الاتصال بالخادم المزود' });
  }
});

// 1. Get Merchant Info and Balance (Admin only)
app.get('/api/sc/me', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authHeaders = await getAuthHeaders(req);
    const response = await fetch(`${SC_STORE_BASE_URL}/me`, {
      method: 'GET',
      headers: authHeaders,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.error) {
      return res.json({
        error: true,
        message: data?.message || 'تعذر جلب بيانات الحساب من SC Store أو المفتاح غير صالح',
        user: {
          name: data?.user?.name || data?.name || '',
          email: data?.user?.email || data?.email || '',
          balance: parseFloat(data?.user?.balance ?? '0') || 0,
          emailVerified: !!data?.user?.emailVerified,
          identityVerified: !!data?.user?.identityVerified,
        },
        apiStatus: response.status,
        isFallback: false,
      });
    }
    return res.json(data);
  } catch (error: any) {
    console.error('Error in /api/sc/me:', error);
    return res.json({
      error: true,
      message: error.message || 'فشل الاتصال بـ SC Store',
      user: {
        name: '',
        email: '',
        balance: 0,
        emailVerified: false,
        identityVerified: false,
      },
      isFallback: false,
    });
  }
});

// ==========================================
// SC STORE PRODUCT SYNC & SCHEDULE CONFIG
// ==========================================
interface ScSyncSettingsState {
  intervalMinutes: number;
  autoSyncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'fallback' | 'error' | 'idle';
  lastSyncMessage: string;
  lastSyncStats: {
    total: number;
    games: number;
    apps: number;
    cards: number;
    telecom: number;
    cash: number;
  } | null;
  nextSyncAt: string | null;
  isSyncing: boolean;
}

let scSyncSettings: ScSyncSettingsState = {
  intervalMinutes: 60,
  autoSyncEnabled: true,
  lastSyncAt: null,
  lastSyncStatus: 'idle',
  lastSyncMessage: 'لم تتم المزامنة بعد',
  lastSyncStats: null,
  nextSyncAt: null,
  isSyncing: false,
};

let autoSyncTimer: NodeJS.Timeout | null = null;

export const performProductSync = async (triggeredBy: string = 'manual', explicitHeaders?: Record<string, string>) => {
  if (scSyncSettings.isSyncing) {
    return {
      success: false,
      isLive: false,
      isFallback: true,
      products: cachedLiveProducts?.products || SC_STORE_DEFAULT_PRODUCTS_PAYLOAD.products,
      stats: scSyncSettings.lastSyncStats || { total: 0, games: 0, apps: 0, cards: 0, telecom: 0, cash: 0 },
      message: 'عملية مزامنة المنتجات والأسعار قيد التنفيذ بالفعل حالياً...',
      timestamp: new Date().toISOString(),
      settings: scSyncSettings,
    };
  }

  scSyncSettings.isSyncing = true;
  let liveProducts: any = null;
  let isLive = false;
  let isFallback = false;
  let apiStatus = 200;
  let apiMessage = '';

  try {
    const headers = explicitHeaders || await getAuthHeaders();

    // 1. Try authenticated /v1/products
    try {
      const response = await fetch(`${SC_STORE_BASE_URL}/products`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(4500),
      });

      const data = await response.json().catch(() => null);
      if (response.ok && data && !data.error && data.products) {
        liveProducts = data;
        cachedLiveProducts = data;
        isLive = true;
      } else {
        apiStatus = response.status;
        apiMessage = data?.message || data?.error || `SC Store API error (status ${response.status})`;
      }
    } catch (fetchErr: any) {
      apiStatus = 500;
      apiMessage = fetchErr.message || 'Connection error to SC Store';
    }

    // 2. If authenticated /v1/products was unavailable or returned 403,
    // fetch live catalog directly from SC Store public section endpoints
    if (!liveProducts) {
      try {
        const [gamesRes, appsRes, cardsRes, balanceRes] = await Promise.all([
          fetch('https://sc-store.top/api/sections/game-charge/products', { signal: AbortSignal.timeout(4000) }).catch(() => null),
          fetch('https://sc-store.top/api/sections/app-charge/products', { signal: AbortSignal.timeout(4000) }).catch(() => null),
          fetch('https://sc-store.top/api/sections/cards/products', { signal: AbortSignal.timeout(4000) }).catch(() => null),
          fetch('https://sc-store.top/api/balance/products', { signal: AbortSignal.timeout(4000) }).catch(() => null),
        ]);

        if (gamesRes && gamesRes.ok && appsRes && appsRes.ok) {
          const gamesData: any = await gamesRes.json();
          const appsData: any = await appsRes.json();
          const cardsData: any = cardsRes && cardsRes.ok ? await cardsRes.json() : { apps: [] };
          const balanceData: any = balanceRes && balanceRes.ok ? await balanceRes.json().catch(() => null) : null;

          const games: any[] = [];
          for (const app of gamesData.apps || []) {
            for (const pkg of app.packages || []) {
              const imgPath = pkg.image || app.image;
              games.push({
                id: pkg.supplierProductId,
                name: pkg.name,
                gameName: app.gameName,
                image: imgPath.startsWith('http') ? imgPath : `https://sc-store.top${imgPath}`,
                Image_url: imgPath.startsWith('http') ? imgPath : `https://sc-store.top${imgPath}`,
                image_url: imgPath.startsWith('http') ? imgPath : `https://sc-store.top${imgPath}`,
                price: Number(Number(pkg.price).toFixed(2)),
                pricePerUnit: pkg.pricePerUnit ? Number(Number(pkg.pricePerUnit).toFixed(4)) : Number(Number(pkg.price).toFixed(2)),
                isAmount: pkg.isAmount || false,
                minQty: pkg.minCount || 1,
                maxQty: pkg.maxCount || 1,
                dynamicFields: pkg.dynamicFields || [
                  { name: 'Player_ID', label: 'ID اللاعب', placeholder: '5XXXXXXXXX', required: true }
                ],
                note: pkg.note || undefined,
              });
            }
          }

          const apps: any[] = [];
          for (const app of appsData.apps || []) {
            for (const pkg of app.packages || []) {
              const imgPath = pkg.image || app.image;
              apps.push({
                id: pkg.supplierProductId,
                name: pkg.name,
                gameName: app.gameName,
                image: imgPath.startsWith('http') ? imgPath : `https://sc-store.top${imgPath}`,
                Image_url: imgPath.startsWith('http') ? imgPath : `https://sc-store.top${imgPath}`,
                image_url: imgPath.startsWith('http') ? imgPath : `https://sc-store.top${imgPath}`,
                price: Number(Number(pkg.price).toFixed(2)),
                pricePerUnit: pkg.pricePerUnit ? Number(Number(pkg.pricePerUnit).toFixed(6)) : Number(Number(pkg.price).toFixed(2)),
                isAmount: pkg.isAmount || false,
                minQty: pkg.minCount || 1,
                maxQty: pkg.maxCount || 100000,
                dynamicFields: pkg.dynamicFields || [
                  { name: 'account_id', label: 'معرف الحساب / الآيدي', placeholder: 'أدخل الآيدي', required: true }
                ],
                note: pkg.note || undefined,
              });
            }
          }

          const cards: any[] = [];
          for (const app of cardsData.apps || []) {
            for (const pkg of app.packages || []) {
              const imgPath = pkg.image || app.image;
              cards.push({
                id: pkg.supplierProductId,
                name: pkg.name,
                gameName: app.gameName,
                image: imgPath.startsWith('http') ? imgPath : `https://sc-store.top${imgPath}`,
                Image_url: imgPath.startsWith('http') ? imgPath : `https://sc-store.top${imgPath}`,
                image_url: imgPath.startsWith('http') ? imgPath : `https://sc-store.top${imgPath}`,
                price: Number(Number(pkg.price).toFixed(2)),
                pricePerUnit: pkg.pricePerUnit ? Number(Number(pkg.pricePerUnit).toFixed(4)) : Number(Number(pkg.price).toFixed(2)),
                isAmount: pkg.isAmount || false,
                minQty: pkg.minCount || 1,
                maxQty: pkg.maxCount || 100,
                dynamicFields: pkg.dynamicFields || [],
                note: pkg.note || undefined,
                isCodeProduct: true,
              });
            }
          }

          let liveSyriatel = SC_STORE_DEFAULT_PRODUCTS_PAYLOAD.products.syriatel;
          let liveMtn = SC_STORE_DEFAULT_PRODUCTS_PAYLOAD.products.mtn;

          if (balanceData) {
            if (Array.isArray(balanceData.syriatel) && balanceData.syriatel.length > 0) {
              liveSyriatel = balanceData.syriatel.map((item: any) => ({
                id: item.supplierProductId,
                productId: item.supplierProductId,
                name: item.name,
                gameName: 'سيريتل',
                category: 'وحدات سيريتل',
                sectionKey: 'syriatel',
                image: 'https://sc-store.top/logos/syriatel.png',
                Image_url: 'https://sc-store.top/logos/syriatel.png',
                image_url: 'https://sc-store.top/logos/syriatel.png',
                price: Number(Number(item.price).toFixed(2)),
                currency: 'SYP',
                inStock: !item.suspended,
                isAmount: false,
                minQty: 1,
                maxQty: 1,
                dynamicFields: [
                  {
                    name: 'phone_number',
                    label: 'رقم خط سيريتل',
                    placeholder: '09XXXXXXXX',
                    required: true,
                    helpText: 'يرجى إدخال رقم خط سيريتل المراد تعبئته (10 أرقام)',
                  },
                ],
                note: 'تعبئة رصيد وحدات سيريتل فوري ومباشر',
              }));
            }

            if (Array.isArray(balanceData.mtn) && balanceData.mtn.length > 0) {
              liveMtn = balanceData.mtn.map((item: any) => ({
                id: item.supplierProductId,
                productId: item.supplierProductId,
                name: item.name,
                gameName: 'MTN',
                category: 'وحدات MTN',
                sectionKey: 'mtn',
                image: 'https://sc-store.top/logos/mtn.png',
                Image_url: 'https://sc-store.top/logos/mtn.png',
                image_url: 'https://sc-store.top/logos/mtn.png',
                price: Number(Number(item.price).toFixed(2)),
                currency: 'SYP',
                inStock: !item.suspended,
                isAmount: false,
                minQty: 1,
                maxQty: 1,
                dynamicFields: [
                  {
                    name: 'phone_number',
                    label: 'رقم خط MTN',
                    placeholder: '09XXXXXXXX',
                    required: true,
                    helpText: 'يرجى إدخال رقم خط MTN المراد تعبئته (10 أرقام)',
                  },
                ],
                note: 'تعبئة رصيد وحدات MTN فوري ومباشر',
              }));
            }
          }

          liveProducts = {
            products: {
              games,
              apps,
              cards,
              syriatel: liveSyriatel,
              mtn: liveMtn,
              cashbalances: SC_STORE_DEFAULT_PRODUCTS_PAYLOAD.products.cashbalances,
            },
          };
          cachedLiveProducts = liveProducts;
          isLive = true;
        }
      } catch (secErr: any) {
        console.warn('Failed to fetch from live section endpoints during sync:', secErr.message);
      }
    }

    if (!liveProducts) {
      isFallback = true;
      liveProducts = cachedLiveProducts || SC_STORE_DEFAULT_PRODUCTS_PAYLOAD;
      cachedLiveProducts = liveProducts;
    }

    // Compute stats
    const prods = liveProducts.products || liveProducts;
    const gamesCount = Array.isArray(prods?.games) ? prods.games.length : 0;
    const appsCount = Array.isArray(prods?.apps) ? prods.apps.length : 0;
    const cardsCount = Array.isArray(prods?.cards) ? prods.cards.length : 0;
    const syriatelCount = Array.isArray(prods?.syriatel) ? prods.syriatel.length : 0;
    const mtnCount = Array.isArray(prods?.mtn) ? prods.mtn.length : 0;
    const cashCount = Array.isArray(prods?.cashbalances) ? prods.cashbalances.length : 0;
    const telecomCount = syriatelCount + mtnCount;
    const totalCount = gamesCount + appsCount + cardsCount + telecomCount + cashCount;

    const stats = {
      total: totalCount,
      games: gamesCount,
      apps: appsCount,
      cards: cardsCount,
      telecom: telecomCount,
      cash: cashCount,
    };

    const nowIso = new Date().toISOString();
    scSyncSettings.lastSyncAt = nowIso;
    scSyncSettings.lastSyncStats = stats;
    scSyncSettings.lastSyncStatus = isLive ? 'success' : isFallback ? 'fallback' : 'error';
    scSyncSettings.lastSyncMessage = isLive
      ? `تمت مزامنة وتحديث ${totalCount} منتج وباقة وأسعارها من المورد بنجاح (${triggeredBy === 'scheduled' ? 'مجدول تلقائياً' : 'يدوي'})`
      : `تم تحديث قائمة المنتجات (${totalCount} منتج) عبر النسخة المعتمدة الاحتياطية`;

    // Persist status to DB
    try {
      const pool = getDbPool();
      if (pool) {
        await pool.query(
          `INSERT INTO store_settings (key, value, updated_at)
           VALUES ('sc_sync_status', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [JSON.stringify({
            lastSyncAt: nowIso,
            lastSyncStatus: scSyncSettings.lastSyncStatus,
            lastSyncMessage: scSyncSettings.lastSyncMessage,
            lastSyncStats: stats,
            triggeredBy,
          })]
        );
      }
    } catch (e: any) {
      console.warn('Failed to save sync status to DB:', e.message);
    }

    return {
      success: true,
      isLive,
      isFallback,
      products: liveProducts.products || liveProducts,
      stats,
      message: scSyncSettings.lastSyncMessage,
      timestamp: nowIso,
      settings: scSyncSettings,
    };
  } catch (err: any) {
    console.error('Error during performProductSync:', err);
    scSyncSettings.lastSyncStatus = 'error';
    scSyncSettings.lastSyncMessage = err.message || 'خطأ غير متوقع أثناء المزامنة';
    return {
      success: false,
      isLive: false,
      isFallback: true,
      products: cachedLiveProducts?.products || SC_STORE_DEFAULT_PRODUCTS_PAYLOAD.products,
      stats: scSyncSettings.lastSyncStats || { total: 0, games: 0, apps: 0, cards: 0, telecom: 0, cash: 0 },
      message: scSyncSettings.lastSyncMessage,
      timestamp: new Date().toISOString(),
      settings: scSyncSettings,
      error: err.message,
    };
  } finally {
    scSyncSettings.isSyncing = false;
  }
};

const setupAutoSyncTimer = () => {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }

  if (scSyncSettings.autoSyncEnabled && scSyncSettings.intervalMinutes > 0) {
    const ms = scSyncSettings.intervalMinutes * 60 * 1000;
    scSyncSettings.nextSyncAt = new Date(Date.now() + ms).toISOString();
    console.log(`⏱️ Scheduled automatic product & price sync every ${scSyncSettings.intervalMinutes} minutes. Next sync: ${scSyncSettings.nextSyncAt}`);

    autoSyncTimer = setInterval(async () => {
      console.log(`⏱️ [Auto-Sync] Running scheduled sync (every ${scSyncSettings.intervalMinutes}m)...`);
      await performProductSync('scheduled');
      if (scSyncSettings.intervalMinutes > 0) {
        scSyncSettings.nextSyncAt = new Date(Date.now() + scSyncSettings.intervalMinutes * 60 * 1000).toISOString();
      }
    }, ms);
  } else {
    scSyncSettings.nextSyncAt = null;
    console.log('⏱️ Automatic product sync is disabled.');
  }
};

const loadSyncSettingsFromDb = async () => {
  try {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query('SELECT value FROM store_settings WHERE key = $1', ['sc_sync_settings']);
      if (res.rows.length > 0 && res.rows[0].value) {
        let val = res.rows[0].value;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch {}
        }
        if (val) {
          if (typeof val.intervalMinutes === 'number' && val.intervalMinutes >= 1) {
            scSyncSettings.intervalMinutes = Math.floor(val.intervalMinutes);
          }
          if (typeof val.autoSyncEnabled === 'boolean') {
            scSyncSettings.autoSyncEnabled = val.autoSyncEnabled;
          }
        }
      }

      const statusRes = await pool.query('SELECT value FROM store_settings WHERE key = $1', ['sc_sync_status']);
      if (statusRes.rows.length > 0 && statusRes.rows[0].value) {
        let val = statusRes.rows[0].value;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch {}
        }
        if (val) {
          scSyncSettings.lastSyncAt = val.lastSyncAt || null;
          scSyncSettings.lastSyncStatus = val.lastSyncStatus || 'idle';
          scSyncSettings.lastSyncMessage = val.lastSyncMessage || '';
          scSyncSettings.lastSyncStats = val.lastSyncStats || null;
        }
      }
    }
  } catch (err: any) {
    console.warn('Could not load sync settings from DB:', err.message);
  }

  setupAutoSyncTimer();
};

// 1.8. Get Current Sync Settings & Status (Admin only)
app.get('/api/sc/sync/status', requireAdmin, async (_req: Request, res: Response) => {
  return res.json({
    intervalMinutes: scSyncSettings.intervalMinutes,
    autoSyncEnabled: scSyncSettings.autoSyncEnabled,
    lastSyncAt: scSyncSettings.lastSyncAt,
    lastSyncStatus: scSyncSettings.lastSyncStatus,
    lastSyncMessage: scSyncSettings.lastSyncMessage,
    lastSyncStats: scSyncSettings.lastSyncStats,
    nextSyncAt: scSyncSettings.nextSyncAt,
    isSyncing: scSyncSettings.isSyncing,
  });
});

// 1.9. Update Sync Interval & Auto-sync state (Admin only)
app.post('/api/sc/sync/settings', requireAdmin, async (req: Request, res: Response) => {
  const { intervalMinutes, autoSyncEnabled } = req.body || {};

  if (intervalMinutes !== undefined) {
    const parsed = parseInt(String(intervalMinutes), 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 10080) {
      return res.status(400).json({ error: 'المدة الزمنية يجب أن تكون رقماً بالدقائق بين 1 دقيقة و 10080 دقيقة (أسبوع)' });
    }
    scSyncSettings.intervalMinutes = parsed;
  }

  if (autoSyncEnabled !== undefined) {
    scSyncSettings.autoSyncEnabled = Boolean(autoSyncEnabled);
  }

  // Persist to DB
  try {
    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `INSERT INTO store_settings (key, value, updated_at)
         VALUES ('sc_sync_settings', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify({
          intervalMinutes: scSyncSettings.intervalMinutes,
          autoSyncEnabled: scSyncSettings.autoSyncEnabled,
        })]
      );
    }
  } catch (e: any) {
    console.warn('Failed to save sc_sync_settings to DB:', e.message);
  }

  setupAutoSyncTimer();

  return res.json({
    success: true,
    message: `تم حفظ إعدادات زمن المزامنة بنجاح (كل ${scSyncSettings.intervalMinutes} دقيقة)`,
    settings: {
      intervalMinutes: scSyncSettings.intervalMinutes,
      autoSyncEnabled: scSyncSettings.autoSyncEnabled,
      lastSyncAt: scSyncSettings.lastSyncAt,
      lastSyncStatus: scSyncSettings.lastSyncStatus,
      lastSyncMessage: scSyncSettings.lastSyncMessage,
      lastSyncStats: scSyncSettings.lastSyncStats,
      nextSyncAt: scSyncSettings.nextSyncAt,
      isSyncing: scSyncSettings.isSyncing,
    },
  });
});

// 1.95. Trigger Immediate Sync Now (Admin only)
app.post('/api/sc/sync/now', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authHeaders = await getAuthHeaders(req);
    const syncResult = await performProductSync('manual', authHeaders);
    return res.json(syncResult);
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message || 'فشل تشغيل المزامنة الآن' });
  }
});

// 2. Get All Products (Live with graceful fallback when 403 or offline)
app.get('/api/sc/products', async (req: Request, res: Response) => {
  try {
    if (cachedLiveProducts && cachedLiveProducts.products) {
      return res.json({
        ...cachedLiveProducts,
        isLive: true,
        apiStatus: 200,
        products: cachedLiveProducts.products,
      });
    }

    const authHeaders = await getAuthHeaders(req);
    const syncResult = await performProductSync('request', authHeaders);
    return res.json({
      error: false,
      status: 200,
      isLive: syncResult.isLive,
      isFallback: syncResult.isFallback,
      apiStatus: 200,
      apiMessage: syncResult.message,
      products: syncResult.products,
    });
  } catch (error: any) {
    console.error('Error in /api/sc/products:', error);
    return res.json({
      error: false,
      status: 200,
      isFallback: true,
      apiStatus: 500,
      apiMessage: error.message || 'Internal Server Error',
      products: SC_STORE_DEFAULT_PRODUCTS_PAYLOAD.products,
    });
  }
});

// Helper: get USD to SYP exchange rate
async function getUsdToSypRate(): Promise<number> {
  try {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query("SELECT value FROM store_settings WHERE key = 'exchange_rate'");
      if (res.rows.length > 0 && res.rows[0].value) {
        let val = res.rows[0].value;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch {}
        }
        if (val && typeof val === 'object' && val.usd_to_syp) {
          const rate = Number(val.usd_to_syp);
          if (rate > 0) return rate;
        } else if (typeof val === 'number' && val > 0) {
          return val;
        }
      }
    }
  } catch (err) {
    console.warn('Error reading usd_to_syp exchange rate:', err);
  }
  return 15000;
}

// Helper: find product info in cached/default products
function findProductInfo(productId: string | number) {
  const pId = String(productId);
  const productsObj = cachedLiveProducts?.products || SC_STORE_DEFAULT_PRODUCTS_PAYLOAD.products;
  if (!productsObj) return null;

  for (const catKey of Object.keys(productsObj)) {
    const list = productsObj[catKey];
    if (Array.isArray(list)) {
      const found = list.find((p: any) => String(p.productId || p.id) === pId);
      if (found) return found;
    }
  }
  return null;
}

// Anti-duplicate protection: 60-second window
// "عند تكرار ارسال طلب لنفس المنتج و نفس عنوان الحساب المراد شحنه في غضون ٦٠ ثانية عالج طلب واحد و الغي الباقي"
const recentOrderAttempts = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentOrderAttempts.entries()) {
    if (now - timestamp > 65000) {
      recentOrderAttempts.delete(key);
    }
  }
}, 120000);

// Central order sync & refund logic for processing/pending orders
export async function syncAndRefundProcessingOrders(orderIds?: string[], userId?: string) {
  const pool = getDbPool();
  if (!pool) {
    return {
      success: true,
      totalChecked: 0,
      updatedCount: 0,
      completedCount: 0,
      stillProcessingCount: 0,
      rejectedCount: 0,
      orders: [],
      message: 'قاعدة البيانات غير متصلة',
    };
  }

  let querySql = `
    SELECT id, order_id, sc_order_id, user_id, total, currency, status, notes
    FROM orders 
    WHERE status IN ('processing', 'pending')
  `;
  const queryParams: any[] = [];

  if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
    querySql += ` AND (order_id = ANY($1) OR sc_order_id = ANY($1))`;
    queryParams.push(orderIds);
  } else if (userId) {
    querySql += ` AND user_id = $1`;
    queryParams.push(userId);
  }

  querySql += ` ORDER BY created_at DESC LIMIT 50;`;

  const dbRes = await pool.query(querySql, queryParams);
  const dbOrders = dbRes.rows;

  if (dbOrders.length === 0) {
    return {
      success: true,
      message: 'لا توجد أي طلبات قيد المعالجة حالياً للتحقق منها.',
      totalChecked: 0,
      updatedCount: 0,
      completedCount: 0,
      stillProcessingCount: 0,
      rejectedCount: 0,
      orders: [],
    };
  }

  const uniqueIds = Array.from(
    new Set(dbOrders.map((r: any) => String(r.sc_order_id || r.order_id || '').trim()))
  ).filter(Boolean);

  if (uniqueIds.length === 0) {
    return {
      success: true,
      message: 'لا توجد معرفات صالحة للطلبات قيد المعالجة.',
      totalChecked: 0,
      updatedCount: 0,
      orders: [],
    };
  }

  const scQueryPath = uniqueIds.length === 1
    ? `${SC_STORE_BASE_URL}/orders/${encodeURIComponent(uniqueIds[0])}`
    : `${SC_STORE_BASE_URL}/orders/${encodeURIComponent(uniqueIds.join(':'))}`;

  const authHeaders = await getAuthHeaders();
  const scResponse = await fetch(scQueryPath, {
    method: 'GET',
    headers: authHeaders,
  });

  const scData = await scResponse.json().catch(() => null);
  if (!scResponse.ok || !scData) {
    return {
      success: false,
      error: scData?.message || scData?.error || 'تعذر الاتصال بـ SC Store API للتحقق من الطلبات',
      totalChecked: uniqueIds.length,
      updatedCount: 0,
    };
  }

  let returnedOrdersList: any[] = [];
  if (Array.isArray(scData.orders)) {
    returnedOrdersList = scData.orders;
  } else if (scData.order && typeof scData.order === 'object') {
    returnedOrdersList = [scData.order];
  } else if (Array.isArray(scData)) {
    returnedOrdersList = scData;
  } else if (scData.data && Array.isArray(scData.data)) {
    returnedOrdersList = scData.data;
  }

  let updatedCount = 0;
  let completedCount = 0;
  let stillProcessingCount = 0;
  let rejectedCount = 0;

  for (const item of returnedOrdersList) {
    const itemOrderId = String(item.orderId || item.id || '').trim();
    const itemStatus = String(item.status || '').toLowerCase();
    if (!itemOrderId || !itemStatus) continue;

    const matchingDbOrder = dbOrders.find(
      (r: any) => r.order_id === itemOrderId || r.sc_order_id === itemOrderId
    );
    if (!matchingDbOrder) continue;

    if (itemStatus.includes('complete') || itemStatus.includes('success')) {
      completedCount++;
      try {
        const updateRes = await pool.query(
          `UPDATE orders 
           SET status = 'completed', raw_response = $1, updated_at = NOW() 
           WHERE id = $2 AND status != 'completed'
           RETURNING id;`,
          [JSON.stringify(item), matchingDbOrder.id]
        );
        if (updateRes.rowCount && updateRes.rowCount > 0) {
          updatedCount++;
        }
      } catch (e) {
        console.warn(`Failed to update completed order ${itemOrderId}:`, e);
      }
    } else if (
      itemStatus.includes('fail') ||
      itemStatus.includes('reject') ||
      itemStatus.includes('cancel') ||
      itemStatus.includes('refund') ||
      itemStatus.includes('error')
    ) {
      rejectedCount++;
      try {
        // Only refund if order is currently processing/pending (prevent double refund)
        const currentCheck = await pool.query(
          `SELECT id, user_id, total, currency, status FROM orders WHERE id = $1 AND status IN ('processing', 'pending')`,
          [matchingDbOrder.id]
        );

        if (currentCheck.rows.length > 0) {
          const orderToRefund = currentCheck.rows[0];
          const refundAmount = parseFloat(orderToRefund.total) || 0;
          const targetUserId = orderToRefund.user_id;

          if (targetUserId && refundAmount > 0) {
            // Restore user balance
            await pool.query(
              `UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
              [refundAmount, targetUserId]
            );

            // Record refund in wallet_transactions
            const txId = `TX-REFUND-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await pool.query(
              `INSERT INTO wallet_transactions (
                id, user_id, type, amount, currency, status, payment_method, reference_id, notes, created_at
              ) VALUES ($1, $2, 'refund', $3, $4, 'completed', 'system', $5, 'استرجاع تلقائي: الطلب غير مكتمل أو مرفوض من المزود', NOW())`,
              [txId, targetUserId, refundAmount, orderToRefund.currency || 'USD', itemOrderId]
            );
          }

          // Mark status as 'failed' ("غير مكتمل") as requested
          await pool.query(
            `UPDATE orders 
             SET status = 'failed', 
                 notes = COALESCE(notes, '') || ' [غير مكتمل - تم استرجاع الرصيد للمستخدم]', 
                 raw_response = $1, 
                 updated_at = NOW() 
             WHERE id = $2`,
            [JSON.stringify(item), matchingDbOrder.id]
          );
          updatedCount++;
        }
      } catch (e) {
        console.warn(`Failed to process failed/refunded order ${itemOrderId}:`, e);
      }
    } else {
      stillProcessingCount++;
      await pool.query(
        `UPDATE orders SET raw_response = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(item), matchingDbOrder.id]
      ).catch(() => {});
    }
  }

  return {
    success: true,
    message: `تم التحقق من ${uniqueIds.length} طلب قيد المعالجة بنجاح.`,
    totalChecked: uniqueIds.length,
    updatedCount,
    completedCount,
    stillProcessingCount,
    rejectedCount,
    orders: returnedOrdersList,
    raw: scData,
  };
}

// Background Worker: periodically checks processing orders every 25 seconds and auto-refunds if failed
setInterval(async () => {
  try {
    const pool = getDbPool();
    if (!pool) return;
    const res = await pool.query(
      `SELECT id, order_id, sc_order_id FROM orders 
       WHERE status IN ('processing', 'pending') 
         AND created_at >= NOW() - INTERVAL '1 day'
       ORDER BY created_at DESC LIMIT 20;`
    );
    if (res.rows.length > 0) {
      const ids = res.rows.map((r: any) => r.sc_order_id || r.order_id).filter(Boolean);
      if (ids.length > 0) {
        await syncAndRefundProcessingOrders(ids);
      }
    }
  } catch (err) {
    // silently catch background polling errors
  }
}, 25000);

function generateUniqueOrderId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `NX-${yy}${mm}${dd}-${rand}`;
}

// 3. Create New Order / Top-up
// Supports both game/app products & cash transfer
app.post('/api/sc/orders', ordersRateLimiter, async (req: Request, res: Response) => {
  const authUser = authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({
      error: 'يرجى تسجيل الدخول أولاً بحسابك لإتمام عملية الشحن والدفع من رصيدك.',
    });
  }

  const uniqueOperationOrderId = generateUniqueOrderId();

  const {
    productId,
    qty,
    dynamicFields,
    cashType,
    amount,
    wallet,
    customerName,
  } = req.body;

  try {
    const pool = getDbPool();

    // 1. Determine target account and product identifier for 60s duplicate check
    let rawTarget = String(
      wallet ||
      dynamicFields?.wallet ||
      dynamicFields?.phone_number ||
      dynamicFields?.phone ||
      dynamicFields?.mobile ||
      dynamicFields?.Player_ID ||
      dynamicFields?.player_id ||
      ''
    ).trim();

    // Normalize Syrian mobile phone format if it looks like a phone number
    let cleanWallet = rawTarget;
    const digitsOnly = rawTarget.replace(/[^\d+]/g, '');
    if (digitsOnly.startsWith('+963') && digitsOnly.length >= 12) {
      cleanWallet = '0' + digitsOnly.slice(4);
    } else if (digitsOnly.startsWith('00963') && digitsOnly.length >= 13) {
      cleanWallet = '0' + digitsOnly.slice(5);
    } else if (digitsOnly.length === 9 && digitsOnly.startsWith('9')) {
      cleanWallet = '0' + digitsOnly;
    }

    if (dynamicFields && typeof dynamicFields === 'object') {
      if (dynamicFields.phone_number) dynamicFields.phone_number = cleanWallet;
      if (dynamicFields.wallet) dynamicFields.wallet = cleanWallet;
      if (dynamicFields.mobile) dynamicFields.mobile = cleanWallet;
    }

    const targetAccount = cleanWallet.toLowerCase();
    const productIdentifier = String(productId || cashType || '').trim();

    // 2. Anti-duplicate check: "عند تكرار ارسال طلب لنفس المنتج و نفس عنوان الحساب المراد شحنه في غضون ٦٠ ثانية عالج طلب واحد و الغي الباقي"
    if (targetAccount && productIdentifier) {
      const dupKey = `${targetAccount}_${productIdentifier}`;
      const lastAttempt = recentOrderAttempts.get(dupKey);
      if (lastAttempt && Date.now() - lastAttempt < 60000) {
        const remainingSec = Math.ceil((60000 - (Date.now() - lastAttempt)) / 1000);
        return res.status(429).json({
          error: `تم إلغاء الطلب: تم إرسال طلب مماثل لنفس المنتج وعنوان الحساب خلال الـ 60 ثانية الماضية لمنع التكرار (يرجى الانتظار ${remainingSec} ثانية).`,
          isDuplicate: true,
        });
      }

      // Also check in DB orders within 60s
      if (pool) {
        const dbDupRes = await pool.query(
          `SELECT id, order_id, created_at FROM orders 
           WHERE (product_id = $1 OR (dynamic_fields->>'productId') = $1)
             AND (
               LOWER(COALESCE(dynamic_fields->>'Player_ID', '')) = $2
               OR LOWER(COALESCE(dynamic_fields->>'player_id', '')) = $2
               OR LOWER(COALESCE(dynamic_fields->>'phone_number', '')) = $2
               OR LOWER(COALESCE(dynamic_fields->>'phone', '')) = $2
               OR LOWER(COALESCE(dynamic_fields->>'mobile', '')) = $2
               OR LOWER(COALESCE(dynamic_fields->>'wallet', '')) = $2
             )
             AND created_at >= NOW() - INTERVAL '60 seconds'
           LIMIT 1;`,
          [productIdentifier, targetAccount]
        );
        if (dbDupRes.rows.length > 0) {
          return res.status(429).json({
            error: 'تم إلغاء الطلب: تم إرسال طلب مماثل لنفس المنتج وعنوان الحساب خلال الـ 60 ثانية الماضية لمنع التكرار.',
            isDuplicate: true,
          });
        }
      }

      // Record lock timestamp for 60s
      recentOrderAttempts.set(dupKey, Date.now());
    }

    // 3. Authenticated User Lookup & Balance Check
    let dbUser: any = null;
    if (pool) {
      try {
        const userRes = await pool.query(
          'SELECT id, name, email, balance, currency, role FROM users WHERE id = $1 OR email = $2 LIMIT 1;',
          [authUser.userId, authUser.email]
        );

        if (userRes.rows.length > 0) {
          dbUser = userRes.rows[0];
        }
      } catch (dbErr: any) {
        console.warn('DB error in user lookup for order, falling back to memory:', dbErr.message);
      }
    }

    if (!dbUser) {
      dbUser = findInMemoryUser(authUser.userId) || findInMemoryUser(authUser.email);
    }

    if (!dbUser) {
      return res.status(404).json({ error: 'حساب المستخدم غير موجود' });
    }

    const userBalance = parseFloat(dbUser.balance || '0');
    const userCurrency = 'SYP';

    // 4. Calculate actual required order cost strictly from server catalog (No client price manipulation)
    let unitPrice = 0;
    let itemCurrency = 'USD';
    let prodName = '';
    let prodCategory = '';

    let normalizedCashType = cashType;
    if (cashType) {
      normalizedCashType = String(cashType).toLowerCase().includes('mtn') ? 'mtn_cash' : 'syriatel_cash';
      unitPrice = Number(amount || dynamicFields?.amount || 0);
      if (!unitPrice || unitPrice <= 0) {
        return res.status(400).json({ error: 'المبلغ مطلوب ويجب أن يكون أكبر من الصفر' });
      }
      itemCurrency = 'SYP';
      prodName = normalizedCashType === 'mtn_cash' ? 'تحويل MTN كاش' : 'تحويل سيريتل كاش';
      prodCategory = 'خدمات الكاش';
    } else if (productId) {
      const catalogProd = findProductInfo(productId);
      if (catalogProd && catalogProd.price !== undefined) {
        unitPrice = Number(catalogProd.price || 0);
        itemCurrency = String(catalogProd.currency || 'USD').toUpperCase();
        prodName = catalogProd.name;
        prodCategory = catalogProd.category;
      } else {
        return res.status(400).json({ error: 'المنتج المطلوب غير موجود أو غير متوفر في الكتالوج' });
      }
    } else {
      return res.status(400).json({ error: 'معرّف المنتج أو نوع الكاش مطلوب' });
    }

    const orderQty = cashType ? 1 : Math.max(1, Number(qty || 1));
    const totalRawPrice = cashType ? unitPrice : (unitPrice * orderQty);

    const usdToSyp = await getUsdToSypRate();
    let costInUserCurrency = totalRawPrice;

    // Convert item cost to SYP (the user's balance currency)
    if (itemCurrency === 'USD' || itemCurrency === '$') {
      costInUserCurrency = Math.round(totalRawPrice * usdToSyp);
    } else {
      costInUserCurrency = Math.round(totalRawPrice);
    }

    // 5. Balance Check
    // "تحقق من رصيد المستخدم قبل إرسال الطلب في حال كان رصيد المستخدم غير كافي أظهر له شاشة منبثقة رصيدك غير كافي"
    if (userBalance < costInUserCurrency) {
      return res.status(400).json({
        error: 'رصيدك غير كافي',
        insufficientBalance: true,
        requiredBalance: costInUserCurrency,
        currentBalance: userBalance,
        currency: 'SYP',
      });
    }

    // 6. Build SC Store API payload
    let scRequestBody: any;
    if (cashType) {
      if (!cleanWallet) {
        return res.status(400).json({ error: 'رقم المحفظة (wallet) مطلوب لطلب تحويل الكاش' });
      }
      if (!unitPrice || unitPrice <= 0) {
        return res.status(400).json({ error: 'المبلغ (amount) مطلوب لطلب تحويل الكاش' });
      }
      scRequestBody = {
        cashType: normalizedCashType,
        amount: unitPrice,
        wallet: cleanWallet,
      };
    } else {
      if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
      }

      // Standardize dynamicFields keys (e.g. Player_ID, player_id, User_ID, user_id)
      const preparedDynamicFields: Record<string, any> = { ...(dynamicFields || {}) };
      const candidatePlayerId =
        dynamicFields?.Player_ID ||
        dynamicFields?.player_id ||
        dynamicFields?.playerId ||
        dynamicFields?.id ||
        dynamicFields?.account_id;
      if (candidatePlayerId) {
        preparedDynamicFields['Player_ID'] = String(candidatePlayerId).trim();
        preparedDynamicFields['player_id'] = String(candidatePlayerId).trim();
      }
      const candidateUserId = dynamicFields?.User_ID || dynamicFields?.user_id || dynamicFields?.userId;
      if (candidateUserId) {
        preparedDynamicFields['User_ID'] = String(candidateUserId).trim();
        preparedDynamicFields['user_id'] = String(candidateUserId).trim();
      }

      scRequestBody = {
        productId: Number(productId) || productId,
        qty: orderQty,
        dynamicFields: preparedDynamicFields,
      };
    }

    // 7. Atomically deduct balance from user
    let newBalanceAfterDeduct = userBalance - costInUserCurrency;
    let deducted = false;

    if (pool) {
      try {
        const deductRes = await pool.query(
          `UPDATE users 
           SET balance = balance - $1, updated_at = NOW() 
           WHERE id = $2 AND balance >= $1 
           RETURNING balance;`,
          [costInUserCurrency, dbUser.id]
        );
        if (deductRes.rows.length > 0) {
          newBalanceAfterDeduct = parseFloat(deductRes.rows[0].balance);
          deducted = true;
        }
      } catch (deductErr: any) {
        console.warn('DB error deducting balance, using memory:', deductErr.message);
      }
    }

    if (!deducted) {
      const memUser = findInMemoryUser(dbUser.id);
      if (memUser && (memUser.balance || 0) >= costInUserCurrency) {
        memUser.balance = (memUser.balance || 0) - costInUserCurrency;
        memUser.updatedAt = new Date().toISOString();
        newBalanceAfterDeduct = memUser.balance;
        deducted = true;
      }
    }

    if (!deducted) {
      return res.status(400).json({
        error: 'رصيدك غير كافي',
        insufficientBalance: true,
        requiredBalance: costInUserCurrency,
        currentBalance: userBalance,
        currency: userCurrency,
      });
    }

    // Record purchase transaction
    const txId = `TX-PURCHASE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO wallet_transactions (
            id, user_id, type, amount, currency, status, payment_method, reference_id, notes, created_at
          ) VALUES ($1, $2, 'purchase', $3, $4, 'completed', 'wallet_balance', $5, $6, NOW())`,
          [txId, dbUser.id, costInUserCurrency, userCurrency, String(productId || cashType), `طلب شحن ${prodName || 'منتج'}`]
        );
      } catch (txErr: any) {
        console.warn('DB transaction logging skipped:', txErr.message);
      }
    }

    // 8. Send order to SC Store API
    const authHeaders = await getAuthHeaders(req, { 'Content-Type': 'application/json' });
    let scResponse: any = null;
    let scData: any = null;
    let scFetchError: any = null;

    try {
      scResponse = await fetch(`${SC_STORE_BASE_URL}/orders`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(scRequestBody),
      });
      scData = await scResponse.json().catch(() => null);
    } catch (fetchErr: any) {
      scFetchError = fetchErr;
    }

    // 9. Handle supplier/network failure: Mark as failed (غير مكتملة) and refund balance immediately
    if (scFetchError || !scResponse || !scResponse.ok || !scData || scData.error) {
      const supplierErrMsg = scData?.message || scData?.error || scFetchError?.message || 'تعذر الاتصال بالمزود الخارجي';
      const isApiKeyErr =
        scResponse?.status === 401 ||
        scResponse?.status === 403 ||
        String(supplierErrMsg).includes('مفتاح API') ||
        String(supplierErrMsg).toLowerCase().includes('api key') ||
        String(supplierErrMsg).toLowerCase().includes('unauthorized') ||
        String(supplierErrMsg).toLowerCase().includes('forbidden');

      // Immediate Rollback / Refund deducted user balance
      let restoredBalance = newBalanceAfterDeduct + costInUserCurrency;
      if (pool) {
        try {
          await pool.query(
            `UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
            [costInUserCurrency, dbUser.id]
          );

          const rollbackTxId = `TX-REFUND-FAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await pool.query(
            `INSERT INTO wallet_transactions (
              id, user_id, type, amount, currency, status, payment_method, reference_id, notes, created_at
            ) VALUES ($1, $2, 'refund', $3, $4, 'completed', 'system', $5, $6, NOW())`,
            [
              rollbackTxId,
              dbUser.id,
              costInUserCurrency,
              userCurrency,
              String(productId || cashType),
              `استرجاع تلقائي: الطلب غير مكتمل لدى المزود (${supplierErrMsg})`,
            ]
          );

          const userBalRes = await pool.query('SELECT balance FROM users WHERE id = $1', [dbUser.id]);
          if (userBalRes.rows.length > 0) {
            restoredBalance = parseFloat(userBalRes.rows[0].balance || '0');
          }
        } catch (refundErr) {
          console.error('Critical rollback refund error in DB:', refundErr);
        }
      }

      const memUser = findInMemoryUser(dbUser.id);
      if (memUser) {
        memUser.balance = (memUser.balance || 0) + costInUserCurrency;
        memUser.updatedAt = new Date().toISOString();
        restoredBalance = memUser.balance;
      }

      // Record the failed order in orders table and memory
      const failedOrderId = uniqueOperationOrderId;
      const failedOrderObj = {
        id: failedOrderId,
        orderId: failedOrderId,
        scOrderId: failedOrderId,
        userId: dbUser.id,
        productId: String(productId || cashType || ''),
        productName: prodName || 'منتج رقمي',
        category: prodCategory || 'شحن',
        qty: orderQty,
        price: unitPrice,
        total: costInUserCurrency,
        currency: userCurrency,
        dynamicFields: dynamicFields || {},
        status: 'failed',
        statusLabel: 'غير مكتملة',
        notes: `طلب غير مكتمل - ${supplierErrMsg} (تم استرجاع الرصيد للمستخدم)`,
        customerName: dbUser.name || customerName || '',
        customerEmail: dbUser.email || authUser.email || '',
        createdAt: new Date().toISOString(),
      };
      inMemoryOrders.set(failedOrderId, failedOrderObj);

      if (pool) {
        try {
          await pool.query(
            `INSERT INTO orders (
              id, order_id, sc_order_id, user_id, product_id, product_name, category, 
              qty, price, total, currency, dynamic_fields, status, raw_response, 
              notes, customer_name, customer_email, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              raw_response = EXCLUDED.raw_response,
              notes = EXCLUDED.notes,
              updated_at = NOW();`,
            [
              failedOrderId,
              failedOrderId,
              failedOrderId,
              dbUser.id,
              String(productId || cashType || ''),
              prodName || 'منتج رقمي',
              prodCategory || 'شحن',
              orderQty,
              unitPrice,
              costInUserCurrency,
              userCurrency,
              JSON.stringify(dynamicFields || {}),
              'failed',
              JSON.stringify({ supplierError: supplierErrMsg, status: scResponse?.status || 500, response: scData }),
              `طلب غير مكتمل - ${supplierErrMsg} (تم استرجاع الرصيد للمستخدم)`,
              dbUser.name || customerName || '',
              dbUser.email || authUser.email || '',
            ]
          );
        } catch (orderSaveErr) {
          console.error('Failed to save failed order status in DB:', orderSaveErr);
        }
      }

      const formattedError = isApiKeyErr
        ? 'عذراً حدث خطأ من قبلنا: مفتاح الربط مع مزود الخدمة غير صالح حالياً. تم استرجاع رصيدك بالكامل.'
        : `عذراً حدث خطأ من قبلنا: ${supplierErrMsg} (تم إلغاء الطلب كـ غير مكتمل واسترجاع رصيدك بالكامل).`;

      return res.status(200).json({
        success: false,
        error: formattedError,
        message: formattedError,
        orderId: failedOrderId,
        status: 'failed',
        statusLabel: 'غير مكتملة',
        refunded: true,
        refundAmount: costInUserCurrency,
        supplierError: supplierErrMsg,
        isApiKeyError: isApiKeyErr,
        user: {
          id: dbUser.id,
          balance: restoredBalance,
          currency: userCurrency,
        },
      });
    }

    // 10. SC Store succeeded -> persist order
    const scOrderId = String(scData.order?.orderId || scData.orderId || scData.id || '').trim();
    const scStatus = String(scData.order?.status || scData.status || 'processing').toLowerCase();

    const successOrderObj = {
      id: uniqueOperationOrderId,
      orderId: uniqueOperationOrderId,
      scOrderId: scOrderId || uniqueOperationOrderId,
      userId: dbUser.id,
      productId: String(productId || cashType || ''),
      productName: prodName || scData.order?.product || 'منتج رقمي',
      category: prodCategory || scData.order?.category || '',
      qty: orderQty,
      price: unitPrice,
      total: costInUserCurrency,
      currency: userCurrency,
      dynamicFields: dynamicFields || {},
      status: scStatus,
      rawResponse: scData,
      customerName: dbUser.name || customerName,
      customerEmail: dbUser.email || authUser.email,
      createdAt: new Date().toISOString(),
    };
    inMemoryOrders.set(uniqueOperationOrderId, successOrderObj);

    if (pool) {
      try {
        await pool.query(
          `INSERT INTO orders (
            id, order_id, sc_order_id, user_id, product_id, product_name, category, 
            qty, price, total, currency, dynamic_fields, status, raw_response, 
            customer_name, customer_email, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            raw_response = EXCLUDED.raw_response,
            updated_at = NOW();`,
          [
            uniqueOperationOrderId,
            uniqueOperationOrderId,
            scOrderId || uniqueOperationOrderId,
            dbUser.id,
            String(productId || cashType || ''),
            prodName || scData.order?.product || 'منتج رقمي',
            prodCategory || scData.order?.category || '',
            orderQty,
            unitPrice,
            costInUserCurrency,
            userCurrency,
            JSON.stringify(dynamicFields || {}),
            scStatus,
            JSON.stringify(scData),
            dbUser.name || customerName,
            dbUser.email || authUser.email,
          ]
        );
      } catch (dbOrderErr: any) {
        console.warn('DB order save failed, stored in memory:', dbOrderErr.message);
      }
    }

    return res.json({
      error: false,
      success: true,
      orderId: uniqueOperationOrderId,
      scOrderId: scOrderId || uniqueOperationOrderId,
      order: {
        orderId: uniqueOperationOrderId,
        scOrderId: scOrderId || uniqueOperationOrderId,
        status: scStatus,
        product: prodName || scData.order?.product,
        category: prodCategory || scData.order?.category,
        price: costInUserCurrency,
        newBalance: newBalanceAfterDeduct,
      },
      user: {
        id: dbUser.id,
        balance: newBalanceAfterDeduct,
        currency: userCurrency,
      },
      raw: scData,
    });
  } catch (error: any) {
    console.error('Error in /api/sc/orders:', error);
    return res.status(500).json({ error: 'عذراً حدث خطأ من قبلنا', details: error.message });
  }
});

// 4. Check Processing Orders Only (Authenticated & User-Scoped)
app.post('/api/sc/orders/check-processing', async (req: Request, res: Response) => {
  const authUser = authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }

  const isAdm = authUser.role === 'admin' || isAdminEmail(authUser.email);
  const { orderIds } = req.body || {};
  // Non-admins can only check their own orders
  const effectiveUserId = isAdm ? (req.body?.userId || null) : authUser.userId;

  try {
    const result = await syncAndRefundProcessingOrders(orderIds, effectiveUserId);
    return res.json(result);
  } catch (error: any) {
    console.error('Error in /api/sc/orders/check-processing:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 5. Check Order Status (Single or Multiple with : separator)
app.get('/api/sc/orders/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).json({ error: 'orderId parameter is required' });
  }

  try {
    const pool = getDbPool();
    let scQueryId = orderId;
    let localDbOrder: any = null;

    if (pool) {
      // Find matching order in DB
      const dbMatch = await pool.query(
        'SELECT * FROM orders WHERE order_id = $1 OR sc_order_id = $1 OR id = $1 LIMIT 1',
        [orderId]
      );
      if (dbMatch.rows.length > 0) {
        localDbOrder = dbMatch.rows[0];
        if (localDbOrder.sc_order_id && localDbOrder.sc_order_id !== orderId) {
          scQueryId = localDbOrder.sc_order_id;
        }

        // IDOR Check: Ensure requester is admin or order owner
        const authUser = authenticateRequest(req);
        const isAdm = authUser && (authUser.role === 'admin' || isAdminEmail(authUser.email));
        if (!isAdm) {
          if (!authUser) {
            return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول للتحقق من تفاصيل الطلب' });
          }
          const isOwner =
            (localDbOrder.user_id && localDbOrder.user_id === authUser.userId) ||
            (localDbOrder.customer_email && localDbOrder.customer_email.toLowerCase() === authUser.email.toLowerCase());
          if (!isOwner) {
            return res.status(403).json({ error: 'غير مصرح لك بالاطلاع على هذا الطلب' });
          }
        }
      }
      await syncAndRefundProcessingOrders([orderId, scQueryId]);
    }

    const authHeaders = await getAuthHeaders(req);
    const response = await fetch(`${SC_STORE_BASE_URL}/orders/${encodeURIComponent(scQueryId)}`, {
      method: 'GET',
      headers: authHeaders,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (localDbOrder) {
        return res.json({
          order: {
            orderId: localDbOrder.order_id,
            productId: localDbOrder.product_id,
            product: localDbOrder.product_name,
            total: parseFloat(localDbOrder.total || '0'),
            currency: localDbOrder.currency,
            status: localDbOrder.status,
            dynamicFields: localDbOrder.dynamic_fields,
            notes: localDbOrder.notes,
            createdAt: localDbOrder.created_at,
          },
        });
      }
      return res.status(response.status).json(data || { error: 'Failed to fetch order status', status: response.status });
    }

    // If successful response from supplier, ensure orderId returned is our orderId if available
    if (data && localDbOrder) {
      if (data.order && typeof data.order === 'object') {
        data.order.uniqueOrderId = localDbOrder.order_id;
        data.order.dynamicFields = localDbOrder.dynamic_fields || data.order.dynamicFields;
      }
    }

    return res.json(data);
  } catch (error: any) {
    console.error('Error in /api/sc/orders/:orderId:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  const db = getDbStatus();
  res.json({
    status: 'ok',
    store: 'Nexen Store',
    service: 'SC Store API & Neon PostgreSQL Service',
    database: {
      connected: db.connected,
      configured: db.hasConfig,
    },
  });
});

// Helper: map DB row to OrderItem interface
function mapDbOrderToOrderItem(row: any) {
  return {
    id: row.id || row.order_id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    category: row.category,
    qty: row.qty,
    price: parseFloat(row.price || '0'),
    total: parseFloat(row.total || '0'),
    currency: row.currency || 'USD',
    dynamicFields: row.dynamic_fields || {},
    status: row.status || 'pending',
    scOrderId: row.sc_order_id,
    notes: row.notes,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    createdAt: row.created_at,
    rawResponse: row.raw_response,
  };
}

async function startServer() {
  // Auto-initialize and push database schema if DATABASE_URL is available
  console.log('🔄 Initializing database schema check and auto-push...');
  initializeDatabase().then((res) => {
    if (res.success) {
      console.log('🚀 Neon Database initialized and synced successfully!');
    } else {
      console.log(`ℹ️ Neon DB status: ${res.error || 'Running in local fallback mode'}`);
    }
    // Load Sync Settings & Schedule from DB
    loadSyncSettingsFromDb();
  }).catch((e) => {
    console.warn('⚠️ Neon DB startup warning:', e.message);
    loadSyncSettingsFromDb();
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexen Store server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
