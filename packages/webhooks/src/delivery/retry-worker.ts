import { config } from '../config';
import * as deliveryRepo from '../repositories/delivery.repo';
import * as webhookRepo from '../repositories/webhook.repo';
import { deliver } from './sender';

let intervalHandle: ReturnType<typeof setInterval> | null = null;

async function processRetries(): Promise<void> {
  try {
    const deliveries = await deliveryRepo.getPendingRetries();

    for (const delivery of deliveries) {
      const webhook = await webhookRepo.getWebhookById(delivery.webhook_id);
      if (!webhook || !webhook.is_active) {
        await deliveryRepo.markFailed(delivery.id, null, 'Webhook disabled or deleted');
        continue;
      }

      await deliver(webhook, delivery);
    }
  } catch (err) {
    console.error('Retry worker error:', err);
  }
}

export function startRetryWorker(): void {
  console.log(`Retry worker started (interval: ${config.delivery.retryWorkerIntervalMs}ms)`);
  intervalHandle = setInterval(processRetries, config.delivery.retryWorkerIntervalMs);
}

export function stopRetryWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('Retry worker stopped');
  }
}
