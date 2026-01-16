/**
 * Event Sourcing Configuration
 *
 * Configure these via environment variables or use defaults for development.
 * For Supabase, you can find your connection string in the Supabase dashboard.
 */
export const config = {
  // PostgreSQL (Supabase) Configuration
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    // For Supabase, use the connection string directly
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },

  // RabbitMQ Configuration
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE || 'domain_events',
    publisherId: process.env.RABBITMQ_PUBLISHER_ID || 'reservation-service-rabbitmq-publisher',
  },

  // Event Relayer Configuration
  eventRelayer: {
    pollingIntervalMs: parseInt(process.env.EVENT_RELAYER_POLLING_INTERVAL || '1000'),
    batchSize: parseInt(process.env.EVENT_RELAYER_BATCH_SIZE || '100'),
  },
};
