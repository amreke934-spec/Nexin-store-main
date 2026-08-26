import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getDbPool, initializeDatabase, getDbStatus, queryDb } from './server/db';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const SC_STORE_BASE_URL = 'https://sc-store.top/api/v1';
const DEFAULT_API_KEY = process.env.SC_STORE_API_KEY || 'sc_xIfrLuz7-N0HT-8xsM-zwg6-iLbNBrEhKag2';

const getApiKey = (req: Request): string => {
  const customKey = req.headers['x-api-key'] as string;
  return customKey || DEFAULT_API_KEY;
};

const getAuthHeaders = (req: Request, extraHeaders: Record<string, string> = {}): Record<string, string> => {
  const apiKey = getApiKey(req);
  return {
    'Authorization': `Bearer ${apiKey}`,
    'X-Api-Key': apiKey,
    'Accept': 'application/json',
    'User-Agent': 'NexenStore/1.0',
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
// 4.5. ADMIN DASHBOARD, USERS & STATS APIS
// ==========================================

// 1. Admin Stats & Analytics
app.get('/api/admin/stats', async (_req: Request, res: Response) => {
  try {
    const pool = getDbPool();
    if (!pool) {
      return res.json({
        totalUsers: 1,
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        failedOrders: 0,
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
    console.error('Error in /api/admin/stats:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. Admin: Get all registered users with their details and order count
app.get('/api/admin/users', async (_req: Request, res: Response) => {
  try {
    const pool = getDbPool();
    if (!pool) {
      return res.json({
        users: [
          {
            id: 'USR-ADMIN',
            name: 'مدير المتجر',
            email: 'm74321176@gmail.com',
            phone: '+963900000000',
            balance: 100.0,
            currency: 'USD',
            role: 'admin',
            createdAt: new Date().toISOString(),
            ordersCount: 0,
            totalSpent: 0,
          },
        ],
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
    console.error('Error in GET /api/admin/users:', err);
    return res.status(500).json({ error: err.message });
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
      const scResponse = await fetch(`${SC_STORE_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers: getAuthHeaders(req),
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

// 1. Get Merchant Info and Balance
app.get('/api/sc/me', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SC_STORE_BASE_URL}/me`, {
      method: 'GET',
      headers: getAuthHeaders(req),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(response.status).json(data || { error: 'Failed to fetch user data', status: response.status });
    }
    return res.json(data);
  } catch (error: any) {
    console.error('Error in /api/sc/me:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 2. Get All Products
app.get('/api/sc/products', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${SC_STORE_BASE_URL}/products`, {
      method: 'GET',
      headers: getAuthHeaders(req),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(response.status).json(data || { error: 'Failed to fetch products', status: response.status });
    }
    return res.json(data);
  } catch (error: any) {
    console.error('Error in /api/sc/products:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 3. Create New Order / Top-up
app.post('/api/sc/orders', async (req: Request, res: Response) => {
  const { productId, qty, dynamicFields } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  try {
    const response = await fetch(`${SC_STORE_BASE_URL}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(req, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        productId,
        qty: qty || 1,
        dynamicFields: dynamicFields || {},
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(response.status).json(data || { error: 'Failed to create order', status: response.status });
    }
    return res.json(data);
  } catch (error: any) {
    console.error('Error in /api/sc/orders:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 4. Check Order Status (Single or Multiple with : separator)
app.get('/api/sc/orders/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).json({ error: 'orderId parameter is required' });
  }

  try {
    const response = await fetch(`${SC_STORE_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: getAuthHeaders(req),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(response.status).json(data || { error: 'Failed to fetch order status', status: response.status });
    }

    // Auto-update order status in database if present
    const pool = getDbPool();
    if (pool && data && data.status) {
      pool.query(
        'UPDATE orders SET status = $1, raw_response = $2, updated_at = NOW() WHERE order_id = $3 OR sc_order_id = $3',
        [data.status, JSON.stringify(data), orderId]
      ).catch(() => {});
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
  }).catch((e) => {
    console.warn('⚠️ Neon DB startup warning:', e.message);
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
