import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getDbPool, initializeDatabase, getDbStatus, queryDb } from './server/db';
import { SC_STORE_DEFAULT_PRODUCTS_PAYLOAD } from './server/scProductsData';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const SC_STORE_BASE_URL = (process.env.SC_STORE_BASE_URL && process.env.SC_STORE_BASE_URL.trim().replace(/\/+$/, '')) || 'https://sc-store.top/api/v1';
const DEFAULT_API_KEY = (process.env.SC_STORE_API_KEY && process.env.SC_STORE_API_KEY.trim()) || 'sc_c2zhyaCv-3FtC-H7ds-XNLD-6ndNSUaZIpdf';

// In-memory cache for API key and live products
let activeApiKeyCache: string | null = null;
let cachedLiveProducts: any = null;

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

// Force manual schema bootstrap / push
app.post('/api/db/init', async (_req: Request, res: Response) => {
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
// 2. USER AUTH & PROFILE APIS (NEON POSTGRES)
// ==========================================

// Register User in Neon DB
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { name, email, phone, password, avatar } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPhone = phone ? String(phone).trim() : null;

  try {
    const pool = getDbPool();
    if (!pool) {
      // In-memory fallback if DB not configured
      const userId = `USR-${Date.now().toString().slice(-6)}`;
      return res.json({
        success: true,
        user: {
          id: userId,
          name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          balance: 0,
          currency: 'USD',
          role: 'customer',
          createdAt: new Date().toISOString(),
        },
        orders: [],
      });
    }

    // Check if user already exists
    const existing = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = $1 OR (phone IS NOT NULL AND phone = $2) LIMIT 1',
      [cleanEmail, cleanPhone || '']
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      // Fetch user's orders
      const ordersRes = await pool.query(
        'SELECT * FROM orders WHERE user_id = $1 OR customer_email = $2 ORDER BY created_at DESC',
        [user.id, user.email]
      );

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          balance: parseFloat(user.balance || '0'),
          currency: user.currency || 'USD',
          role: user.role || 'customer',
          savedPlayerIds: user.saved_player_ids || {},
          createdAt: user.created_at,
        },
        orders: ordersRes.rows.map(mapDbOrderToOrderItem),
      });
    }

    // Insert new user
    const userId = `USR-${Date.now().toString().slice(-6)}`;
    const insertRes = await pool.query(
      `INSERT INTO users (id, name, email, phone, password_hash, balance, currency, role, avatar, api_key, saved_player_ids, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`,
      [
        userId,
        name.trim(),
        cleanEmail,
        cleanPhone,
        password || null,
        0.00,
        'USD',
        'customer',
        avatar || null,
        DEFAULT_API_KEY,
        JSON.stringify({}),
      ]
    );

    const newUser = insertRes.rows[0];
    return res.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        balance: parseFloat(newUser.balance || '0'),
        currency: newUser.currency || 'USD',
        role: newUser.role || 'customer',
        savedPlayerIds: newUser.saved_player_ids || {},
        createdAt: newUser.created_at,
      },
      orders: [],
    });
  } catch (err: any) {
    console.error('Error in /api/auth/register:', err);
    return res.status(500).json({ error: err.message || 'Database registration error' });
  }
});

// Login User from Neon DB
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  if (!identifier) {
    return res.status(400).json({ error: 'Identifier (email or phone) is required' });
  }

  const cleanId = String(identifier).trim();
  const isEmail = cleanId.includes('@');

  try {
    const pool = getDbPool();
    if (!pool) {
      // In-memory fallback
      const userId = `USR-${Date.now().toString().slice(-6)}`;
      return res.json({
        success: true,
        user: {
          id: userId,
          name: isEmail ? cleanId.split('@')[0] : `مستخدم ${cleanId.slice(-4)}`,
          email: isEmail ? cleanId.toLowerCase() : `${cleanId.replace(/\s+/g, '')}@nexenstore.com`,
          phone: !isEmail ? cleanId : undefined,
          balance: 0,
          currency: 'USD',
          role: 'customer',
          createdAt: new Date().toISOString(),
        },
        orders: [],
      });
    }

    // Lookup by email or phone
    const userRes = await pool.query(
      `SELECT * FROM users 
       WHERE LOWER(email) = LOWER($1) 
          OR phone = $1 
          OR REPLACE(phone, ' ', '') = REPLACE($1, ' ', '')
       LIMIT 1`,
      [cleanId]
    );

    if (userRes.rows.length === 0) {
      // Auto-provision user account on first login if not found
      const newId = `USR-${Date.now().toString().slice(-6)}`;
      const newName = isEmail ? cleanId.split('@')[0] : `مستخدم ${cleanId.slice(-4)}`;
      const newEmail = isEmail ? cleanId.toLowerCase() : `${cleanId.replace(/\s+/g, '')}@nexenstore.com`;
      const newPhone = !isEmail ? cleanId : null;

      const created = await pool.query(
        `INSERT INTO users (id, name, email, phone, balance, currency, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [newId, newName, newEmail, newPhone, 0.0, 'USD', 'customer']
      );

      const user = created.rows[0];
      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          balance: parseFloat(user.balance || '0'),
          currency: user.currency || 'USD',
          role: user.role || 'customer',
          savedPlayerIds: user.saved_player_ids || {},
          createdAt: user.created_at,
        },
        orders: [],
      });
    }

    const user = userRes.rows[0];

    // Fetch user orders
    const ordersRes = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 OR customer_email = $2 ORDER BY created_at DESC',
      [user.id, user.email]
    );

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: parseFloat(user.balance || '0'),
        currency: user.currency || 'USD',
        role: user.role || 'customer',
        savedPlayerIds: user.saved_player_ids || {},
        createdAt: user.created_at,
      },
      orders: ordersRes.rows.map(mapDbOrderToOrderItem),
    });
  } catch (err: any) {
    console.error('Error in /api/auth/login:', err);
    return res.status(500).json({ error: err.message || 'Database login error' });
  }
});

// Update User info / Saved Game IDs
app.post('/api/users/save-player-id', async (req: Request, res: Response) => {
  const { userId, category, playerId } = req.body;

  if (!userId || !category || !playerId) {
    return res.status(400).json({ error: 'userId, category, and playerId are required' });
  }

  try {
    const pool = getDbPool();
    if (!pool) {
      return res.json({ success: true, message: 'Saved in memory' });
    }

    // Update saved_player_ids jsonb
    await pool.query(
      `UPDATE users 
       SET saved_player_ids = COALESCE(saved_player_ids, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify({ [category]: playerId }), userId]
    );

    return res.json({ success: true });
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
    const pool = getDbPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1 OR LOWER(email) = LOWER($1) OR phone = $1 LIMIT 1`,
      [clean]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: parseFloat(user.balance || '0'),
        currency: user.currency || 'USD',
        role: user.role || 'customer',
        savedPlayerIds: user.saved_player_ids || {},
        createdAt: user.created_at,
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

// Get user orders from DB
app.get('/api/orders', async (req: Request, res: Response) => {
  const { userId, email } = req.query;

  try {
    const pool = getDbPool();
    if (!pool) {
      return res.json({ orders: [] });
    }

    let queryText = 'SELECT * FROM orders';
    const params: any[] = [];

    if (userId && email) {
      queryText += ' WHERE user_id = $1 OR customer_email = $2 ORDER BY created_at DESC';
      params.push(String(userId), String(email));
    } else if (userId) {
      queryText += ' WHERE user_id = $1 ORDER BY created_at DESC';
      params.push(String(userId));
    } else if (email) {
      queryText += ' WHERE customer_email = $1 ORDER BY created_at DESC';
      params.push(String(email));
    } else {
      queryText += ' ORDER BY created_at DESC LIMIT 50';
    }

    const result = await pool.query(queryText, params);
    return res.json({ orders: result.rows.map(mapDbOrderToOrderItem) });
  } catch (err: any) {
    console.error('Error in GET /api/orders:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Save order into DB
app.post('/api/orders/save', async (req: Request, res: Response) => {
  const { order, userId } = req.body;

  if (!order || !order.orderId) {
    return res.status(400).json({ error: 'Valid order object is required' });
  }

  try {
    const pool = getDbPool();
    if (!pool) {
      return res.json({ success: true, orderId: order.orderId });
    }

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
      userId || order.userId || null,
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
      order.customerEmail || null,
    ];

    const result = await pool.query(query, values);
    return res.json({ success: true, orderId: result.rows[0].order_id });
  } catch (err: any) {
    console.error('Error in /api/orders/save:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. SETTINGS & CURRENCY APIS (NEON POSTGRES)
// ==========================================

// Get Setting
app.get('/api/settings/:key', async (req: Request, res: Response) => {
  const { key } = req.params;

  try {
    const pool = getDbPool();
    if (!pool) {
      return res.json({ key, value: null });
    }

    const result = await pool.query('SELECT value FROM store_settings WHERE key = $1', [key]);
    if (result.rows.length === 0) {
      return res.json({ key, value: null });
    }

    return res.json({ key, value: result.rows[0].value });
  } catch (err: any) {
    console.error(`Error fetching setting ${key}:`, err);
    return res.status(500).json({ error: err.message });
  }
});

// Save Setting
app.post('/api/settings', async (req: Request, res: Response) => {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ error: 'key and value are required' });
  }

  try {
    const pool = getDbPool();
    if (!pool) {
      return res.json({ success: true, key, value });
    }

    await pool.query(
      `INSERT INTO store_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );

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
  },
  {
    id: 'method_syriatel_cash',
    name: 'سيريتل كاش (Syriatel Cash)',
    currency: 'SYP',
    exchangeRateToSyp: 1,
    depositAddress: '0933 654 321',
    minDeposit: 10000,
    maxDeposit: 2000000,
    details: '1. قم بالتحويل من محفظة سيريتل كاش أو عبر طلب الرمز #304* إلى الرقم أعلاه.\n2. بعد استلام رسالة التأكيد من سيريتل كاش، انسخ رقم العملية وضعه في الخانة المخصصة.\n3. سيتم مراجعة الطلب وإيداع الرصيد في حسابك خلال دقائق.',
    icon: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=128&auto=format&fit=crop&q=80',
    feeEnabled: false,
    feePercentage: 0,
    isActive: true,
    order: 2,
  },
  {
    id: 'method_usdt_trc20',
    name: 'USDT (TRC-20)',
    currency: 'USDT',
    exchangeRateToSyp: 15000,
    depositAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t7K9mX',
    minDeposit: 5,
    maxDeposit: 1000,
    details: '1. أرسل عملة USDT حصراً عبر شبكة Tron (TRC-20) إلى عنوان المحفظة أعلاه.\n2. تحذير: لا ترسل أي عملة أخرى أو عبر شبكة مختلفة لتفادي ضياع الأموال.\n3. بعد تأكيد التحويل في محفظتك (Binance / TrustWallet / Bybit)، الصق رمز التجزئة أو رقم المعاملة (TXID).',
    icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=035',
    feeEnabled: true,
    feePercentage: 1.5,
    isActive: true,
    order: 3,
  },
  {
    id: 'method_alharam',
    name: 'شركة الهرم للحوالات',
    currency: 'SYP',
    exchangeRateToSyp: 1,
    depositAddress: 'دمشق - المستلم: متجر نيكسن لخدمات الشحن - هاتف: 0999 888 777',
    minDeposit: 50000,
    maxDeposit: 15000000,
    details: '1. توجه إلى أي فرع من فروع شركة الهرم للحوالات.\n2. أرسل الحوالة بالاسم والرقم الموضح أعلاه.\n3. التقط صورة لإيصال الحوالة واحتفظ به، ثم أدخل رقم إشعار الحوالة المطبوع على الإيصال.',
    icon: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=128&auto=format&fit=crop&q=80',
    feeEnabled: false,
    feePercentage: 0,
    isActive: true,
    order: 4,
  }
];

let inMemoryDepositMethods = [...DEFAULT_DEPOSIT_METHODS];
let inMemoryDepositRequests: any[] = [];

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
      return res.json({ success: true, methods: inMemoryDepositMethods });
    }

    const result = await pool.query('SELECT value FROM store_settings WHERE key = $1', ['deposit_methods']);
    if (result.rows.length === 0 || !result.rows[0].value) {
      return res.json({ success: true, methods: inMemoryDepositMethods });
    }

    const methods = result.rows[0].value;
    if (Array.isArray(methods) && methods.length > 0) {
      inMemoryDepositMethods = methods;
      return res.json({ success: true, methods });
    }

    return res.json({ success: true, methods: inMemoryDepositMethods });
  } catch (err: any) {
    console.error('Error in GET /api/deposit-methods:', err);
    return res.json({ success: true, methods: inMemoryDepositMethods });
  }
});

// 2. Save / Update deposit methods (Array or single item)
app.post('/api/deposit-methods', async (req: Request, res: Response) => {
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

// 3. Delete deposit method
app.delete('/api/deposit-methods/:id', async (req: Request, res: Response) => {
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

// 4. Get deposit requests (all or by userId)
app.get('/api/deposit-requests', async (req: Request, res: Response) => {
  try {
    const { userId, status } = req.query;
    const pool = getDbPool();

    if (!pool) {
      let filtered = [...inMemoryDepositRequests];
      if (userId) {
        filtered = filtered.filter((r) => r.userId === userId);
      }
      if (status) {
        filtered = filtered.filter((r) => r.status === status);
      }
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return res.json({ success: true, requests: filtered });
    }

    let queryText = 'SELECT * FROM deposit_requests WHERE 1=1';
    const queryParams: any[] = [];

    if (userId) {
      queryParams.push(String(userId));
      queryText += ` AND user_id = $${queryParams.length}`;
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

// 5. Submit new deposit request
app.post('/api/deposit-requests', async (req: Request, res: Response) => {
  try {
    const { userId, methodId, amount, txNumber, notes } = req.body;

    if (!userId || !methodId || amount === undefined || !txNumber) {
      return res.status(400).json({ error: 'يرجى ملء جميع الحقول المطلوبة (المستخدم، طريقة الإيداع، المبلغ، ورقم العملية)' });
    }

    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'يرجى إدخال مبلغ صحيح أكبر من الصفر' });
    }

    const cleanTx = String(txNumber).trim();
    if (cleanTx.length < 3) {
      return res.status(400).json({ error: 'يرجى كتابة رقم عملية صحيح' });
    }

    // Find deposit method
    let method = inMemoryDepositMethods.find((m: any) => m.id === methodId);
    const pool = getDbPool();

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
    const exchangeRateToSyp = parseFloat(String(method.exchangeRateToSyp)) || 1;
    const sypAmount = Math.round(netAmount * exchangeRateToSyp);

    // Fetch user details
    let userName = 'مستخدم';
    let userEmail = '';
    let userPhone = '';

    if (pool) {
      const userRes = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
      if (userRes.rows.length > 0) {
        const u = userRes.rows[0];
        userName = u.name || userName;
        userEmail = u.email || '';
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
        cleanTx, method.depositAddress || '', notes || '', 'pending',
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

// 6. Admin update deposit request status (Approve & Credit Balance / Reject)
app.put('/api/deposit-requests/:id/status', async (req: Request, res: Response) => {
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
      inMemoryDepositRequests[reqIndex] = {
        ...prev,
        status,
        rejectionReason: rejectionReason || '',
        approvedAt: status === 'approved' ? new Date().toISOString() : prev.approvedAt,
        approvedBy: status === 'approved' ? (adminEmail || 'admin') : prev.approvedBy,
        updatedAt: new Date().toISOString(),
      };

      return res.json({ success: true, request: inMemoryDepositRequests[reqIndex] });
    }

    // Query existing request
    const existingRes = await pool.query('SELECT * FROM deposit_requests WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'طلب الإيداع غير موجود' });
    }

    const depositReq = existingRes.rows[0];

    // If already approved, prevent duplicate balance crediting
    if (depositReq.status === 'approved' && status === 'approved') {
      return res.json({ success: true, request: mapDbDepositRequest(depositReq), message: 'الطلب مقبول مسبقاً' });
    }

    // If approving, credit user balance
    if (status === 'approved') {
      const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [depositReq.user_id]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        const userCurrency = (user.currency || 'USD').toUpperCase();
        let balanceToAdd = 0;

        if (userCurrency === 'USD') {
          const rate = parseFloat(depositReq.exchange_rate_to_syp || '15000');
          balanceToAdd = rate > 0 ? (parseFloat(depositReq.syp_amount) / rate) : parseFloat(depositReq.net_amount);
        } else {
          balanceToAdd = parseFloat(depositReq.syp_amount);
        }

        // Update user balance
        await pool.query(
          'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
          [balanceToAdd, user.id]
        );

        // Record in wallet_transactions
        const txId = `TX-${Date.now().toString().slice(-6)}`;
        await pool.query(
          `INSERT INTO wallet_transactions (id, user_id, type, amount, currency, status, payment_method, reference_id, notes, created_at)
           VALUES ($1, $2, 'deposit', $3, $4, 'completed', $5, $6, $7, NOW())`,
          [
            txId,
            user.id,
            balanceToAdd,
            userCurrency,
            depositReq.method_name,
            depositReq.id,
            `إيداع معتمد: ${depositReq.amount} ${depositReq.currency} (رقم العملية: ${depositReq.tx_number})`,
          ]
        );
      }
    }

    // Update deposit request
    const isApproved = status === 'approved';
    const updateRes = isApproved
      ? await pool.query(
          `UPDATE deposit_requests SET
            status = $1,
            rejection_reason = $2,
            approved_at = NOW(),
            approved_by = $3,
            updated_at = NOW()
           WHERE id = $4
           RETURNING *;`,
          ['approved', rejectionReason || null, adminEmail || 'Admin', id]
        )
      : await pool.query(
          `UPDATE deposit_requests SET
            status = $1,
            rejection_reason = $2,
            updated_at = NOW()
           WHERE id = $3
           RETURNING *;`,
          [status, rejectionReason || null, id]
        );

    return res.json({
      success: true,
      request: mapDbDepositRequest(updateRes.rows[0]),
    });
  } catch (err: any) {
    console.error('Error in PUT /api/deposit-requests/:id/status:', err);
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 4.5. ADMIN DASHBOARD, USERS & STATS APIS
// ==========================================

// 1. Admin Stats & Analytics
app.get('/api/admin/stats', async (_req: Request, res: Response) => {
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
app.get('/api/admin/users', async (_req: Request, res: Response) => {
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
      currency: row.currency || 'USD',
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
app.put('/api/admin/users/:userId', async (req: Request, res: Response) => {
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
        user: { id: userId, name, email, phone, balance, role },
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
      updates.push(`balance = $${idx++}`);
      values.push(parseFloat(String(balance)) || 0.0);
    }
    if (role !== undefined) {
      updates.push(`role = $${idx++}`);
      values.push(String(role).trim());
    }
    if (password) {
      updates.push(`password_hash = $${idx++}`);
      values.push(String(password));
    }

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
    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        balance: parseFloat(updatedUser.balance || '0'),
        currency: updatedUser.currency || 'USD',
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
app.delete('/api/admin/users/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const pool = getDbPool();
    if (!pool) {
      return res.json({ success: true, message: 'Deleted from memory' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (err: any) {
    console.error('Error in DELETE /api/admin/users/:userId:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. Admin: Create a new user manually
app.post('/api/admin/users/create', async (req: Request, res: Response) => {
  const { name, email, phone, balance, role, password } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'الاسم والبريد الإلكتروني مطلوبان' });
  }

  try {
    const pool = getDbPool();
    const userId = `USR-${Date.now().toString().slice(-6)}`;
    const userBalance = parseFloat(String(balance)) || 0.0;
    const userRole = role || 'customer';

    if (!pool) {
      return res.json({
        success: true,
        user: {
          id: userId,
          name,
          email: email.trim().toLowerCase(),
          phone,
          balance: userBalance,
          currency: 'USD',
          role: userRole,
          createdAt: new Date().toISOString(),
        },
      });
    }

    const insertRes = await pool.query(
      `INSERT INTO users (id, name, email, phone, balance, currency, role, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *;`,
      [userId, name.trim(), email.trim().toLowerCase(), phone || null, userBalance, 'USD', userRole, password || null]
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
        currency: user.currency || 'USD',
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
app.get('/api/admin/order-check/:orderId', async (req: Request, res: Response) => {
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

// 0. Proxy for SC Store icons (/api/icons/game-charge/:id, etc.)
app.get('/api/icons/*', async (req: Request, res: Response) => {
  try {
    const targetUrl = `https://sc-store.top${req.originalUrl}`;
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
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await scRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(500).end();
  }
});

// 0.1 Proxy for SC Store logos (/logos/mtn.png, /logos/game-charge.png, etc.)
app.get('/logos/*', async (req: Request, res: Response) => {
  try {
    const targetUrl = `https://sc-store.top${req.originalUrl}`;
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
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await scRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(500).end();
  }
});

// 0.5. API Key Management Endpoints
app.get('/api/sc/api-key', async (req: Request, res: Response) => {
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

app.post('/api/sc/api-key', async (req: Request, res: Response) => {
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

// 1. Get Merchant Info and Balance
app.get('/api/sc/me', async (req: Request, res: Response) => {
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

// 1.8. Get Current Sync Settings & Status
app.get('/api/sc/sync/status', async (_req: Request, res: Response) => {
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

// 1.9. Update Sync Interval & Auto-sync state
app.post('/api/sc/sync/settings', async (req: Request, res: Response) => {
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

// 1.95. Trigger Immediate Sync Now
app.post('/api/sc/sync/now', async (req: Request, res: Response) => {
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

// 3. Create New Order / Top-up
// Supports both game/app products & cash transfer
app.post('/api/sc/orders', async (req: Request, res: Response) => {
  const {
    productId,
    qty,
    dynamicFields,
    cashType,
    amount,
    wallet,
    userId,
    userEmail,
    customerName,
    price,
    currency,
    productName,
    category,
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

    // 3. User verification and Balance Check
    if (!userId && !userEmail) {
      return res.status(401).json({
        error: 'يرجى تسجيل الدخول أولاً بحسابك لإتمام عملية الشحن والدفع من رصيدك.',
      });
    }

    if (!pool) {
      return res.status(500).json({ error: 'عذراً حدث خطأ من قبلنا', details: 'Database not connected' });
    }

    const userRes = await pool.query(
      'SELECT id, name, email, balance, currency, role FROM users WHERE id = $1 OR email = $2 LIMIT 1;',
      [userId || '', userEmail || '']
    );

    let dbUser: any;
    if (userRes.rows.length === 0) {
      const fallbackId = userId || `USR-${Date.now().toString().slice(-6)}`;
      const fallbackEmail = userEmail || `${fallbackId.toLowerCase()}@nexen.store`;
      const fallbackName = customerName || 'عميل المتجر';
      const insertFallback = await pool.query(
        `INSERT INTO users (id, name, email, balance, currency, role, created_at, updated_at)
         VALUES ($1, $2, $3, 100.00, 'USD', 'customer', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
         RETURNING id, name, email, balance, currency, role;`,
        [fallbackId, fallbackName, fallbackEmail]
      );
      dbUser = insertFallback.rows[0];
    } else {
      dbUser = userRes.rows[0];
    }
    const userBalance = parseFloat(dbUser.balance || '0');
    const userCurrency = (dbUser.currency || 'USD').toUpperCase();

    // 4. Calculate actual required order cost
    let unitPrice = Number(price || 0);
    let itemCurrency = String(currency || 'USD').toUpperCase();
    let prodName = String(productName || '').trim();
    let prodCategory = String(category || '').trim();

    if (productId) {
      const catalogProd = findProductInfo(productId);
      if (catalogProd) {
        if (!unitPrice || unitPrice <= 0) unitPrice = Number(catalogProd.price || 0);
        if (!itemCurrency) itemCurrency = String(catalogProd.currency || 'USD').toUpperCase();
        if (!prodName) prodName = catalogProd.name;
        if (!prodCategory) prodCategory = catalogProd.category;
      }
    }

    let normalizedCashType = cashType;
    if (cashType) {
      normalizedCashType = String(cashType).toLowerCase().includes('mtn') ? 'mtn_cash' : 'syriatel_cash';
      unitPrice = Number(amount || dynamicFields?.amount || 0);
      itemCurrency = 'SYP';
      if (!prodName) prodName = normalizedCashType === 'mtn_cash' ? 'تحويل MTN كاش' : 'تحويل سيريتل كاش';
      if (!prodCategory) prodCategory = 'خدمات الكاش';
    }

    const orderQty = cashType ? 1 : Math.max(1, Number(qty || 1));
    const totalRawPrice = cashType ? unitPrice : (unitPrice * orderQty);

    const usdToSyp = await getUsdToSypRate();
    let costInUserCurrency = totalRawPrice;

    if (userCurrency === 'USD' && itemCurrency === 'SYP') {
      costInUserCurrency = totalRawPrice / usdToSyp;
      costInUserCurrency = Math.round(costInUserCurrency * 100) / 100;
    } else if (userCurrency === 'SYP' && itemCurrency === 'USD') {
      costInUserCurrency = Math.round(totalRawPrice * usdToSyp);
    } else {
      costInUserCurrency = userCurrency === 'USD' ? Math.round(totalRawPrice * 100) / 100 : Math.round(totalRawPrice);
    }

    // 5. Balance Check
    // "تحقق من رصيد المستخدم الفعلي عند انشاء طلب شراء بعدها اما يتابع الشحن او يظهر له رصيد حسابك غير كافي ( في حال عدم توفر رصيد للمستخدم )"
    if (userBalance < costInUserCurrency) {
      return res.status(400).json({
        error: 'رصيد حسابك غير كافي',
        requiredBalance: costInUserCurrency,
        currentBalance: userBalance,
        currency: userCurrency,
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
    const deductRes = await pool.query(
      `UPDATE users 
       SET balance = balance - $1, updated_at = NOW() 
       WHERE id = $2 AND balance >= $1 
       RETURNING balance;`,
      [costInUserCurrency, dbUser.id]
    );

    if (deductRes.rows.length === 0) {
      return res.status(400).json({
        error: 'رصيد حسابك غير كافي',
      });
    }

    const newBalanceAfterDeduct = parseFloat(deductRes.rows[0].balance);

    // Record purchase transaction in DB
    const txId = `TX-PURCHASE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await pool.query(
      `INSERT INTO wallet_transactions (
        id, user_id, type, amount, currency, status, payment_method, reference_id, notes, created_at
      ) VALUES ($1, $2, 'purchase', $3, $4, 'completed', 'wallet_balance', $5, $6, NOW())`,
      [txId, dbUser.id, costInUserCurrency, userCurrency, String(productId || cashType), `طلب شحن ${prodName || 'منتج'}`]
    );

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

      // Immediate Rollback / Refund deducted user balance in database
      let restoredBalance = newBalanceAfterDeduct;
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
        console.error('Critical rollback refund error:', refundErr);
      }

      // Record the failed order in orders table with status 'failed' ("غير مكتملة")
      const failedOrderId = `ORD-FAIL-${Date.now()}`;
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
            dbUser.email || userEmail || '',
          ]
        );
      } catch (orderSaveErr) {
        console.error('Failed to save failed order status in DB:', orderSaveErr);
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

    // 10. SC Store succeeded -> persist order in DB with initial status
    const scOrderId = String(scData.order?.orderId || scData.orderId || scData.id || `SC-${Date.now()}`).trim();
    const scStatus = String(scData.order?.status || scData.status || 'processing').toLowerCase();

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
        scOrderId,
        scOrderId,
        scOrderId,
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
        dbUser.email || userEmail,
      ]
    );

    return res.json({
      error: false,
      success: true,
      orderId: scOrderId,
      order: {
        orderId: scOrderId,
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

// 4. Check Processing Orders Only (تحقق من الطلبات التي قيد المعالجة فقط)
app.post('/api/sc/orders/check-processing', async (req: Request, res: Response) => {
  const { orderIds, userId } = req.body || {};
  try {
    const result = await syncAndRefundProcessingOrders(orderIds, userId);
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
    // If orderId is in database, run syncAndRefundProcessingOrders for it
    const pool = getDbPool();
    if (pool) {
      await syncAndRefundProcessingOrders([orderId]);
    }

    const authHeaders = await getAuthHeaders(req);
    const response = await fetch(`${SC_STORE_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: authHeaders,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(response.status).json(data || { error: 'Failed to fetch order status', status: response.status });
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
