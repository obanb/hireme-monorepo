import { Pool } from 'pg';
import { config } from '../config';

let pool: Pool | null = null;

export function getRagPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
    });

    pool.on('error', (err) => {
      console.error('[rag-db] Unexpected error on idle PostgreSQL client', err);
    });
  }

  return pool;
}

export async function initializeRagDatabase(): Promise<void> {
  const client = await getRagPool().connect();

  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id BIGSERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536) NOT NULL,
        metadata JSONB DEFAULT '{}',
        indexed_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT embeddings_entity_unique UNIQUE (entity_type, entity_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_embeddings_vector
        ON embeddings USING hnsw (embedding vector_cosine_ops);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_embeddings_entity_type
        ON embeddings (entity_type);
    `);

    console.log('[rag-db] RAG database schema initialized');
  } finally {
    client.release();
  }
}

export async function closeRagPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
