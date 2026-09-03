import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool with SSL configured for Neon / Cloud PostgreSQL
let pool: Pool | null = null;
let isDbConnected = false;
let dbError: string | null = null;

export function getDbPool(): Pool | null {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[Neon DB] DATABASE_URL is not set. Database features will run in local fallback mode.');
    dbError = 'DATABASE_URL is not configured';
    return null;
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[Neon DB] Unexpected pool error:', err);
    });

    return pool;
  } catch (err: any) {
    console.error('[Neon DB] Pool initialization error:', err);
    dbError = err.message || 'Initialization failed';
    return null;
  }
}

// Table column definitions for auto-pushing & migrations
interface ColumnDefinition {
  name: string;
  type: string;
  default?: string;
  nullable?: boolean;
}

interface TableDefinition {
  name: string;
  primaryKey: string;
  columns: ColumnDefinition[];
}

const SCHEMA_DEFINITIONS: TableDefinition[] = [
  {
    name: 'users',
    primaryKey: 'id VARCHAR(128) PRIMARY KEY',
    columns: [
      { name: 'name', type: 'VARCHAR(255)', nullable: false, default: "''" },
      { name: 'email', type: 'VARCHAR(255)', nullable: false, default: "''" },
      { name: 'phone', type: 'VARCHAR(100)' },
      { name: 'password_hash', type: 'VARCHAR(255)' },
      { name: 'balance', type: 'NUMERIC(15, 2)', default: '0.00' },
      { name: 'currency', type: 'VARCHAR(20)', default: "'USD'" },
      { name: 'role', type: 'VARCHAR(50)', default: "'customer'" },
      { name: 'avatar', type: 'TEXT' },
      { name: 'api_key', type: 'TEXT' },
      { name: 'saved_player_ids', type: 'JSONB', default: "'{}'" },
      { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    name: 'orders',
    primaryKey: 'id VARCHAR(128) PRIMARY KEY',
    columns: [
      { name: 'order_id', type: 'VARCHAR(128)' },
      { name: 'user_id', type: 'VARCHAR(128)' },
      { name: 'product_id', type: 'VARCHAR(128)', nullable: false },
      { name: 'product_name', type: 'VARCHAR(255)', nullable: false },
      { name: 'category', type: 'VARCHAR(100)' },
      { name: 'qty', type: 'INTEGER', default: '1' },
      { name: 'price', type: 'NUMERIC(15, 2)', nullable: false, default: '0.00' },
      { name: 'total', type: 'NUMERIC(15, 2)', nullable: false, default: '0.00' },
      { name: 'currency', type: 'VARCHAR(20)', default: "'USD'" },
      { name: 'dynamic_fields', type: 'JSONB', default: "'{}'" },
      { name: 'status', type: 'VARCHAR(50)', default: "'pending'" },
      { name: 'sc_order_id', type: 'VARCHAR(128)' },
      { name: 'raw_response', type: 'JSONB' },
      { name: 'notes', type: 'TEXT' },
      { name: 'customer_name', type: 'VARCHAR(255)' },
      { name: 'customer_email', type: 'VARCHAR(255)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    name: 'wallet_transactions',
    primaryKey: 'id VARCHAR(128) PRIMARY KEY',
    columns: [
      { name: 'user_id', type: 'VARCHAR(128)', nullable: false },
      { name: 'type', type: 'VARCHAR(50)', nullable: false }, // deposit, withdrawal, purchase, refund
      { name: 'amount', type: 'NUMERIC(15, 2)', nullable: false },
      { name: 'currency', type: 'VARCHAR(20)', default: "'USD'" },
      { name: 'status', type: 'VARCHAR(50)', default: "'completed'" },
      { name: 'payment_method', type: 'VARCHAR(100)' },
      { name: 'reference_id', type: 'VARCHAR(128)' },
      { name: 'notes', type: 'TEXT' },
      { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    name: 'store_settings',
    primaryKey: 'key VARCHAR(128) PRIMARY KEY',
    columns: [
      { name: 'value', type: 'JSONB', nullable: false },
      { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    name: 'saved_game_ids',
    primaryKey: 'id VARCHAR(128) PRIMARY KEY',
    columns: [
      { name: 'user_id', type: 'VARCHAR(128)', nullable: false },
      { name: 'game_key', type: 'VARCHAR(100)', nullable: false },
      { name: 'player_id', type: 'VARCHAR(128)', nullable: false },
      { name: 'player_name', type: 'VARCHAR(255)' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    name: 'deposit_requests',
    primaryKey: 'id VARCHAR(128) PRIMARY KEY',
    columns: [
      { name: 'user_id', type: 'VARCHAR(128)', nullable: false },
      { name: 'user_name', type: 'VARCHAR(255)' },
      { name: 'user_email', type: 'VARCHAR(255)' },
      { name: 'user_phone', type: 'VARCHAR(100)' },
      { name: 'method_id', type: 'VARCHAR(128)', nullable: false },
      { name: 'method_name', type: 'VARCHAR(255)', nullable: false },
      { name: 'currency', type: 'VARCHAR(20)', default: "'SYP'" },
      { name: 'exchange_rate_to_syp', type: 'NUMERIC(15, 2)', default: '1.00' },
      { name: 'amount', type: 'NUMERIC(15, 2)', nullable: false },
      { name: 'fee_amount', type: 'NUMERIC(15, 2)', default: '0.00' },
      { name: 'fee_percentage', type: 'NUMERIC(6, 2)', default: '0.00' },
      { name: 'net_amount', type: 'NUMERIC(15, 2)', nullable: false },
      { name: 'syp_amount', type: 'NUMERIC(15, 2)', nullable: false },
      { name: 'tx_number', type: 'VARCHAR(255)', nullable: false },
      { name: 'deposit_address', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
      { name: 'status', type: 'VARCHAR(50)', default: "'pending'" },
      { name: 'rejection_reason', type: 'TEXT' },
      { name: 'approved_at', type: 'TIMESTAMPTZ' },
      { name: 'approved_by', type: 'VARCHAR(128)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
];

/**
 * Automatically creates all tables and pushes missing columns (auto-migration)
 */
export async function initializeDatabase(): Promise<{ success: boolean; error?: string; message?: string }> {
  const currentPool = getDbPool();
  if (!currentPool) {
    return { success: false, error: dbError || 'No database pool configured' };
  }

  let client: PoolClient | null = null;
  try {
    client = await currentPool.connect();
    console.log('⚡ [Neon DB] Connected successfully to PostgreSQL database!');
    isDbConnected = true;
    dbError = null;

    // Iterate through all table definitions and ensure tables + columns exist
    for (const table of SCHEMA_DEFINITIONS) {
      // 1. Create table if not exists with primary key
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${table.name}" (
          ${table.primaryKey}
        );
      `;
      await client.query(createTableQuery);

      // 2. Auto-push each column if not exists (ALTER TABLE ADD COLUMN IF NOT EXISTS)
      for (const col of table.columns) {
        const defaultClause = col.default ? ` DEFAULT ${col.default}` : '';
        const addColQuery = `
          ALTER TABLE "${table.name}" 
          ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}${defaultClause};
        `;
        await client.query(addColQuery);
      }

      console.log(`✅ [Neon DB] Table "${table.name}" and its columns verified & pushed successfully.`);
    }

    // Create index on users email & phone for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user ON wallet_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_deposit_requests_user ON deposit_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
    `);

    // Insert default exchange rate setting if not present
    await client.query(`
      INSERT INTO store_settings (key, value, updated_at)
      VALUES ('exchange_rate', '{"usd_to_syp": 15000}', NOW())
      ON CONFLICT (key) DO NOTHING;
    `);

    // Insert default deposit methods if not present
    const defaultDepositMethods = [
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

    await client.query(`
      INSERT INTO store_settings (key, value, updated_at)
      VALUES ('deposit_methods', $1, NOW())
      ON CONFLICT (key) DO NOTHING;
    `, [JSON.stringify(defaultDepositMethods)]);


    return { success: true, message: 'Database tables and columns pushed successfully' };
  } catch (err: any) {
    console.error('❌ [Neon DB] Error initializing tables/schema:', err);
    isDbConnected = false;
    dbError = err.message || 'Error during schema migration';
    return { success: false, error: dbError || 'Unknown DB error' };
  } finally {
    if (client) {
      client.release();
    }
  }
}

export function getDbStatus() {
  return {
    connected: isDbConnected,
    hasConfig: !!process.env.DATABASE_URL,
    error: dbError,
  };
}

export async function queryDb<T = any>(text: string, params?: any[]): Promise<T[]> {
  const currentPool = getDbPool();
  if (!currentPool) {
    throw new Error(dbError || 'Database not connected');
  }

  const result = await currentPool.query(text, params);
  return result.rows as T[];
}
