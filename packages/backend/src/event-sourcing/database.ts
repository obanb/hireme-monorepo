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

    // Create rooms read model table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        room_number VARCHAR(20) NOT NULL UNIQUE,
        type VARCHAR(20) NOT NULL,
        capacity INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
        color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
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
        room_id UUID REFERENCES rooms(id),
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add room_id column to reservations if it doesn't exist (for existing installations)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'reservations' AND column_name = 'room_id'
        ) THEN
          ALTER TABLE reservations ADD COLUMN room_id UUID REFERENCES rooms(id);
        END IF;
      END $$;
    `);

    // Create event checkpoints table for the event relayer
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_checkpoints (
        id VARCHAR(50) PRIMARY KEY,
        last_processed_event_id BIGINT NOT NULL
      );
    `);

    // Create room_types read model table
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_types (
        id UUID PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create rate_codes read model table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rate_codes (
        id UUID PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add room_type_id column to rooms if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'rooms' AND column_name = 'room_type_id'
        ) THEN
          ALTER TABLE rooms ADD COLUMN room_type_id UUID REFERENCES room_types(id);
        END IF;
      END $$;
    `);

    // Add rate_code_id column to rooms if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'rooms' AND column_name = 'rate_code_id'
        ) THEN
          ALTER TABLE rooms ADD COLUMN rate_code_id UUID REFERENCES rate_codes(id);
        END IF;
      END $$;
    `);

    // Create wellness_therapists read model table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wellness_therapists (
        id UUID PRIMARY KEY,
        code VARCHAR(100) NOT NULL,
        name VARCHAR(200) NOT NULL,
        service_types_bit_mask INT NOT NULL DEFAULT 0,
        is_virtual BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create wellness_room_types read model table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wellness_room_types (
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        bit INT NOT NULL DEFAULT 0,
        mask_value INT NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT true,
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create wellness_services read model table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wellness_services (
        id UUID PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        price_normal DECIMAL(10,2) NOT NULL,
        price_obe DECIMAL(10,2),
        price_ove DECIMAL(10,2),
        vat_charge DECIMAL(5,2) NOT NULL DEFAULT 21.0,
        service_type_bit_mask INT NOT NULL DEFAULT 0,
        duration INT NOT NULL DEFAULT 60,
        pause_before INT NOT NULL DEFAULT 0,
        pause_after INT NOT NULL DEFAULT 0,
        needs_therapist BOOLEAN NOT NULL DEFAULT true,
        needs_room BOOLEAN NOT NULL DEFAULT true,
        is_active BOOLEAN NOT NULL DEFAULT true,
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Fix vat_charge column if it exists with wrong precision
    await client.query(`
      DO $$
      BEGIN
        ALTER TABLE wellness_services ALTER COLUMN vat_charge TYPE DECIMAL(5,2);
      EXCEPTION
        WHEN undefined_table THEN NULL;
        WHEN undefined_column THEN NULL;
      END $$;
    `);

    // Create wellness_bookings read model table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wellness_bookings (
        id UUID PRIMARY KEY,
        reservation_id UUID REFERENCES reservations(id),
        guest_name VARCHAR(200) NOT NULL,
        service_id UUID NOT NULL REFERENCES wellness_services(id),
        therapist_id UUID REFERENCES wellness_therapists(id),
        room_type_id UUID REFERENCES wellness_room_types(id),
        scheduled_date DATE NOT NULL,
        scheduled_time TIME NOT NULL,
        end_time TIME NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
        notes TEXT,
        price DECIMAL(10,2) NOT NULL,
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for wellness bookings
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wellness_bookings_date ON wellness_bookings(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_wellness_bookings_therapist ON wellness_bookings(therapist_id);
      CREATE INDEX IF NOT EXISTS idx_wellness_bookings_status ON wellness_bookings(status);
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
