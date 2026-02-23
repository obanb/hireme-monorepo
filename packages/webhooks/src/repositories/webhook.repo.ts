import { pool } from '../database';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  event_filters: string[];
  description: string | null;
  is_active: boolean;
  disabled_reason: string | null;
  consecutive_failures: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWebhookInput {
  url: string;
  eventFilters: string[];
  description?: string;
  createdBy: string;
}

export interface UpdateWebhookInput {
  url?: string;
  eventFilters?: string[];
  description?: string;
  isActive?: boolean;
}

function generateSecret(): string {
  return 'whsec_' + crypto.randomBytes(32).toString('hex');
}

export async function createWebhook(input: CreateWebhookInput): Promise<Webhook> {
  const id = uuid();
  const secret = generateSecret();

  const result = await pool.query(
    `INSERT INTO webhooks (id, url, secret, event_filters, description, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, input.url, secret, input.eventFilters, input.description || null, input.createdBy]
  );

  return result.rows[0];
}

export async function listWebhooks(): Promise<Webhook[]> {
  const result = await pool.query(
    `SELECT * FROM webhooks WHERE is_active = true OR disabled_reason IS NOT NULL
     ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function getWebhookById(id: string): Promise<Webhook | null> {
  const result = await pool.query('SELECT * FROM webhooks WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateWebhook(id: string, input: UpdateWebhookInput): Promise<Webhook | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.url !== undefined) {
    sets.push(`url = $${paramIndex++}`);
    values.push(input.url);
  }
  if (input.eventFilters !== undefined) {
    sets.push(`event_filters = $${paramIndex++}`);
    values.push(input.eventFilters);
  }
  if (input.description !== undefined) {
    sets.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.isActive !== undefined) {
    sets.push(`is_active = $${paramIndex++}`);
    values.push(input.isActive);
    if (input.isActive) {
      sets.push(`disabled_reason = NULL`);
      sets.push(`consecutive_failures = 0`);
    }
  }

  if (sets.length === 0) return getWebhookById(id);

  sets.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE webhooks SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function softDeleteWebhook(id: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE webhooks SET is_active = false, disabled_reason = 'deleted', updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getActiveWebhooksForEvent(eventType: string): Promise<Webhook[]> {
  const result = await pool.query(
    `SELECT * FROM webhooks WHERE is_active = true AND $1 = ANY(event_filters)`,
    [eventType]
  );
  return result.rows;
}

export async function incrementFailures(id: string): Promise<number> {
  const result = await pool.query(
    `UPDATE webhooks SET consecutive_failures = consecutive_failures + 1, updated_at = NOW()
     WHERE id = $1 RETURNING consecutive_failures`,
    [id]
  );
  return result.rows[0]?.consecutive_failures ?? 0;
}

export async function resetFailures(id: string): Promise<void> {
  await pool.query(
    `UPDATE webhooks SET consecutive_failures = 0, updated_at = NOW() WHERE id = $1`,
    [id]
  );
}

export async function disableWebhook(id: string, reason: string): Promise<void> {
  await pool.query(
    `UPDATE webhooks SET is_active = false, disabled_reason = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, reason]
  );
}
