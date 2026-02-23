import crypto from 'crypto';
import { config } from '../config';
import * as deliveryRepo from '../repositories/delivery.repo';
import * as webhookRepo from '../repositories/webhook.repo';

interface DeliveryResult {
  success: boolean;
  statusCode: number | null;
  body: string | null;
}

function sign(secret: string, timestamp: number, body: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${timestamp}.${body}`);
  return `sha256=${hmac.digest('hex')}`;
}

async function httpPost(
  url: string,
  body: string,
  headers: Record<string, string>
): Promise<DeliveryResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.delivery.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    const responseBody = await response.text();
    return {
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      body: responseBody,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: null,
      body: err instanceof Error ? err.message : 'Unknown error',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function deliver(
  webhook: webhookRepo.Webhook,
  delivery: deliveryRepo.WebhookDelivery
): Promise<void> {
  const bodyStr = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(webhook.secret, timestamp, bodyStr);

  const result = await httpPost(webhook.url, bodyStr, {
    'Content-Type': 'application/json',
    'X-Webhook-Id': webhook.id,
    'X-Webhook-Timestamp': String(timestamp),
    'X-Webhook-Signature': signature,
  });

  if (result.success) {
    await deliveryRepo.markSuccess(delivery.id, result.statusCode!, result.body || '');
    await webhookRepo.resetFailures(webhook.id);
    return;
  }

  // Determine retry or final failure
  const currentAttempt = delivery.attempts + 1; // attempts incremented by markPendingRetry/markFailed
  const { retryDelays, maxRetryAttempts, circuitBreakerThreshold } = config.delivery;

  if (currentAttempt < maxRetryAttempts) {
    const delayMs = retryDelays[currentAttempt] ?? retryDelays[retryDelays.length - 1];
    const nextRetryAt = new Date(Date.now() + delayMs);
    await deliveryRepo.markPendingRetry(delivery.id, result.statusCode, result.body, nextRetryAt);
  } else {
    await deliveryRepo.markFailed(delivery.id, result.statusCode, result.body);
  }

  // Circuit breaker
  const failures = await webhookRepo.incrementFailures(webhook.id);
  if (failures >= circuitBreakerThreshold) {
    await webhookRepo.disableWebhook(webhook.id, 'circuit_breaker');
    console.log(`Webhook ${webhook.id} disabled by circuit breaker after ${failures} consecutive failures`);
  }
}
