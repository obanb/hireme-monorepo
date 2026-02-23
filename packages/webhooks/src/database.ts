import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
});

export async function initializeDatabase(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id UUID PRIMARY KEY,
      url TEXT NOT NULL,
      secret TEXT NOT NULL,
      event_filters TEXT[] NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      disabled_reason TEXT,
      consecutive_failures INTEGER DEFAULT 0,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id UUID PRIMARY KEY,
      webhook_id UUID NOT NULL REFERENCES webhooks(id),
      event_id UUID,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      response_code INTEGER,
      response_body TEXT,
      next_retry_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_deliveries_webhook_created
      ON webhook_deliveries(webhook_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_deliveries_retry
      ON webhook_deliveries(status, next_retry_at);
  `);

  console.log('Database tables initialized');
}
