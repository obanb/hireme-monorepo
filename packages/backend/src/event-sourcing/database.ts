/**
 * PostgreSQL Database Connection Module
 *
 * Handles connection pooling and provides a client for event store operations.
 * Compatible with Supabase PostgreSQL.
 */
import { Pool, PoolClient } from 'pg';
import { config } from './config';

let pool: Pool | null = null;

/**
 * Get or create the database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const poolConfig = config.postgres.connectionString
      ? {
          connectionString: config.postgres.connectionString,
          ssl: config.postgres.ssl,
        }
      : {
          host: config.postgres.host,
          port: config.postgres.port,
          database: config.postgres.database,
          user: config.postgres.user,
          password: config.postgres.password,
          ssl: config.postgres.ssl,
        };

    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  return pool;
}

/**
 * Initialize the database schema for event sourcing
 * Creates the events table, read models, and checkpoint table if they don't exist
 */
export async function initializeDatabase(): Promise<void> {
  const client = await getPool().connect();

  try {
    // Create events table (Event Store)
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        stream_id UUID NOT NULL,
        version INT NOT NULL,
        type VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        metadata JSONB,
        occurred_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT events_stream_version_unique UNIQUE (stream_id, version)
      );
    `);

    // Create index for fast stream loading
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_stream_id ON events(stream_id);
    `);

    // Create reservations read model table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id UUID PRIMARY KEY,
        origin_id VARCHAR(100),
        guest_name TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        check_in_date DATE,
        check_out_date DATE,
        total_amount DECIMAL(10,2),
        currency VARCHAR(3),
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create event checkpoints table for the event relayer
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_checkpoints (
        id VARCHAR(50) PRIMARY KEY,
        last_processed_event_id BIGINT NOT NULL
      );
    `);

    console.log('Database schema initialized successfully');
  } finally {
    client.release();
  }
}

/**
 * Execute a callback within a database transaction
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
