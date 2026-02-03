/**
 * RateCode Projections
 *
 * Transforms events into read models optimized for querying.
 * These projections run synchronously within the same transaction as event writes.
 */
import { PoolClient } from 'pg';
import { StoredEvent } from './event-store';

/**
 * Apply a projection for a rate code event
 * Updates the rate_codes read model based on the event type
 */
export async function applyRateCodeProjection(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  switch (event.type) {
    case 'RateCodeCreated':
      await handleRateCodeCreated(client, streamId, event);
      break;
    case 'RateCodeUpdated':
      await handleRateCodeUpdated(client, streamId, event);
      break;
    case 'RateCodeDeleted':
      await handleRateCodeDeleted(client, streamId, event);
      break;
    default:
      break;
  }
}

/**
 * Handle RateCodeCreated event - insert a new rate code read model
 */
async function handleRateCodeCreated(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  const data = event.data as {
    rateCodeId: string;
    code: string;
    name: string;
    description?: string;
  };

  await client.query(
    `INSERT INTO rate_codes (
      id, code, name, description, is_active, version, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_active = EXCLUDED.is_active,
      version = EXCLUDED.version,
      updated_at = NOW()`,
    [
      streamId,
      data.code,
      data.name,
      data.description || null,
      true,
      event.version,
    ]
  );
}

/**
 * Handle RateCodeUpdated event - update rate code details
 */
async function handleRateCodeUpdated(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  const data = event.data as {
    rateCodeId: string;
    code?: string;
    name?: string;
    description?: string;
    isActive?: boolean;
  };

  const updates: string[] = ['version = $2', 'updated_at = NOW()'];
  const params: (string | number | boolean | null)[] = [streamId, event.version];

  if (data.code !== undefined) {
    params.push(data.code);
    updates.push(`code = $${params.length}`);
  }

  if (data.name !== undefined) {
    params.push(data.name);
    updates.push(`name = $${params.length}`);
  }

  if (data.description !== undefined) {
    params.push(data.description);
    updates.push(`description = $${params.length}`);
  }

  if (data.isActive !== undefined) {
    params.push(data.isActive);
    updates.push(`is_active = $${params.length}`);
  }

  await client.query(
    `UPDATE rate_codes SET ${updates.join(', ')} WHERE id = $1`,
    params
  );
}

/**
 * Handle RateCodeDeleted event - soft delete the rate code
 */
async function handleRateCodeDeleted(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  await client.query(
    `UPDATE rate_codes
     SET is_active = false, version = $2, updated_at = NOW()
     WHERE id = $1`,
    [streamId, event.version]
  );
}

/**
 * Get a rate code from the read model
 */
export async function getRateCode(
  client: PoolClient,
  rateCodeId: string
): Promise<{
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const result = await client.query<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    version: number;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT * FROM rate_codes WHERE id = $1`,
    [rateCodeId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List all rate codes from the read model
 */
export async function listRateCodes(
  client: PoolClient,
  includeInactive: boolean = false
): Promise<Array<{
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}>> {
  let query = 'SELECT * FROM rate_codes';
  if (!includeInactive) {
    query += ' WHERE is_active = true';
  }
  query += ' ORDER BY code ASC';

  const result = await client.query(query);

  return result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
