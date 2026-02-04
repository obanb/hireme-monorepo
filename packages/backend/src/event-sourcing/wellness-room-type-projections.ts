/**
 * WellnessRoomType Projections
 */
import { PoolClient } from 'pg';
import { StoredEvent } from './event-store';

export async function applyWellnessRoomTypeProjection(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  switch (event.type) {
    case 'WellnessRoomTypeCreated':
      await handleCreated(client, streamId, event);
      break;
    case 'WellnessRoomTypeUpdated':
      await handleUpdated(client, streamId, event);
      break;
    case 'WellnessRoomTypeDeleted':
      await handleDeleted(client, streamId, event);
      break;
  }
}

async function handleCreated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as { name: string; bit: number; maskValue: number };
  await client.query(
    `INSERT INTO wellness_room_types (id, name, bit, mask_value, is_active, version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, bit = EXCLUDED.bit, mask_value = EXCLUDED.mask_value,
       is_active = EXCLUDED.is_active, version = EXCLUDED.version, updated_at = NOW()`,
    [streamId, data.name, data.bit, data.maskValue, true, event.version]
  );
}

async function handleUpdated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as { name?: string; bit?: number; maskValue?: number; isActive?: boolean };
  const updates: string[] = ['version = $2', 'updated_at = NOW()'];
  const params: (string | number | boolean)[] = [streamId, event.version];

  if (data.name !== undefined) { params.push(data.name); updates.push(`name = $${params.length}`); }
  if (data.bit !== undefined) { params.push(data.bit); updates.push(`bit = $${params.length}`); }
  if (data.maskValue !== undefined) { params.push(data.maskValue); updates.push(`mask_value = $${params.length}`); }
  if (data.isActive !== undefined) { params.push(data.isActive); updates.push(`is_active = $${params.length}`); }

  await client.query(`UPDATE wellness_room_types SET ${updates.join(', ')} WHERE id = $1`, params);
}

async function handleDeleted(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  await client.query(
    `UPDATE wellness_room_types SET is_active = false, version = $2, updated_at = NOW() WHERE id = $1`,
    [streamId, event.version]
  );
}

export async function getWellnessRoomType(client: PoolClient, id: string) {
  const result = await client.query(`SELECT * FROM wellness_room_types WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id, name: row.name, bit: row.bit, maskValue: row.mask_value,
    isActive: row.is_active, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function listWellnessRoomTypes(client: PoolClient, includeInactive: boolean = false) {
  let query = 'SELECT * FROM wellness_room_types';
  if (!includeInactive) query += ' WHERE is_active = true';
  query += ' ORDER BY name ASC';
  const result = await client.query(query);
  return result.rows.map((row) => ({
    id: row.id, name: row.name, bit: row.bit, maskValue: row.mask_value,
    isActive: row.is_active, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
  }));
}
