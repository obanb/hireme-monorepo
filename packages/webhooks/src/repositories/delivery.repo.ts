import { pool } from '../database';
import { v4 as uuid } from 'uuid';

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed' | 'pending_retry';
  attempts: number;
  response_code: number | null;
  response_body: string | null;
  next_retry_at: Date | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface CreateDeliveryInput {
  webhookId: string;
  eventId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
}

export async function createDelivery(input: CreateDeliveryInput): Promise<WebhookDelivery> {
  const id = uuid();
  const result = await pool.query(
    `INSERT INTO webhook_deliveries (id, webhook_id, event_id, event_type, payload, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [id, input.webhookId, input.eventId, input.eventType, JSON.stringify(input.payload)]
  );
  return result.rows[0];
}

export async function markSuccess(id: string, responseCode: number, responseBody: string): Promise<void> {
  await pool.query(
    `UPDATE webhook_deliveries
     SET status = 'success', response_code = $2, response_body = $3,
         attempts = attempts + 1, completed_at = NOW()
     WHERE id = $1`,
    [id, responseCode, responseBody.slice(0, 1024)]
  );
}

export async function markFailed(id: string, responseCode: number | null, responseBody: string | null): Promise<void> {
  await pool.query(
    `UPDATE webhook_deliveries
     SET status = 'failed', response_code = $2, response_body = $3,
         attempts = attempts + 1, completed_at = NOW(), next_retry_at = NULL
     WHERE id = $1`,
    [id, responseCode, responseBody?.slice(0, 1024) ?? null]
  );
}

export async function markPendingRetry(
  id: string,
  responseCode: number | null,
  responseBody: string | null,
  nextRetryAt: Date
): Promise<void> {
  await pool.query(
    `UPDATE webhook_deliveries
     SET status = 'pending_retry', response_code = $2, response_body = $3,
         attempts = attempts + 1, next_retry_at = $4
     WHERE id = $1`,
    [id, responseCode, responseBody?.slice(0, 1024) ?? null, nextRetryAt]
  );
}

export async function getPendingRetries(): Promise<WebhookDelivery[]> {
  const result = await pool.query(
    `SELECT * FROM webhook_deliveries
     WHERE status = 'pending_retry' AND next_retry_at <= NOW()
     ORDER BY next_retry_at ASC
     LIMIT 100`
  );
  return result.rows;
}

export async function getDeliveriesForWebhook(
  webhookId: string,
  limit = 20
): Promise<WebhookDelivery[]> {
  const result = await pool.query(
    `SELECT * FROM webhook_deliveries
     WHERE webhook_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [webhookId, limit]
  );
  return result.rows;
}

export async function getDeliveryStats(webhookId: string): Promise<{
  total: number;
  successful: number;
  failed: number;
  lastStatus: string | null;
}> {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'success')::int AS successful,
       COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
       (SELECT status FROM webhook_deliveries
        WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT 1) AS last_status
     FROM webhook_deliveries
     WHERE webhook_id = $1`,
    [webhookId]
  );

  const row = result.rows[0];
  return {
    total: row.total,
    successful: row.successful,
    failed: row.failed,
    lastStatus: row.last_status,
  };
}
