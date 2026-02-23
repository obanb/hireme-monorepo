import { createServer } from './server';

createServer().catch((err) => {
  console.error('Failed to start webhooks service:', err);
  process.exit(1);
});
