import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { config } from './config';
import { initializeDatabase } from './database';
import { startConsumer, stopConsumer } from './consumer/event-consumer';
import { startRetryWorker, stopRetryWorker } from './delivery/retry-worker';
import webhookRoutes from './routes/webhook.routes';

export async function createServer(): Promise<void> {
  // Initialize database tables
  await initializeDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // OpenAPI docs
  const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
  if (fs.existsSync(openapiPath)) {
    const spec = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
  }

  // Routes
  app.use('/api/webhooks', webhookRoutes);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'webhooks' });
  });

  // Start RabbitMQ consumer
  try {
    await startConsumer();
  } catch (err) {
    console.error('Failed to start RabbitMQ consumer (will retry on reconnect):', err);
  }

  // Start retry worker
  startRetryWorker();

  const server = app.listen(config.port, () => {
    console.log(`Webhooks service running on port ${config.port}`);
    console.log(`API docs: http://localhost:${config.port}/api/docs`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    stopRetryWorker();
    await stopConsumer();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
