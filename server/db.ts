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
    `);

    // Insert default exchange rate setting if not present
    await client.query(`
      INSERT INTO store_settings (key, value, updated_at)
      VALUES ('exchange_rate', '{"usd_to_syp": 15000}', NOW())
      ON CONFLICT (key) DO NOTHING;
    `);

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
