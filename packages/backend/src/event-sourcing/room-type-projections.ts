/**
 * RoomType Projections
 *
 * Transforms events into read models optimized for querying.
 * These projections run synchronously within the same transaction as event writes.
 */
import { PoolClient } from 'pg';
import { StoredEvent } from './event-store';

/**
 * Apply a projection for a room type event
 * Updates the room_types read model based on the event type
 */
export async function applyRoomTypeProjection(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  switch (event.type) {
    case 'RoomTypeCreated':
      await handleRoomTypeCreated(client, streamId, event);
      break;
    case 'RoomTypeUpdated':
      await handleRoomTypeUpdated(client, streamId, event);
      break;
    case 'RoomTypeDeleted':
      await handleRoomTypeDeleted(client, streamId, event);
      break;
    default:
      break;
  }
}

/**
 * Handle RoomTypeCreated event - insert a new room type read model
 */
async function handleRoomTypeCreated(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  const data = event.data as {
    roomTypeId: string;
    code: string;
    name: string;
  };

  await client.query(
    `INSERT INTO room_types (
      id, code, name, is_active, version, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      version = EXCLUDED.version,
      updated_at = NOW()`,
    [
      streamId,
      data.code,
      data.name,
      true,
      event.version,
    ]
  );
}

/**
 * Handle RoomTypeUpdated event - update room type details
 */
async function handleRoomTypeUpdated(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  const data = event.data as {
    roomTypeId: string;
    code?: string;
    name?: string;
    isActive?: boolean;
  };

  const updates: string[] = ['version = $2', 'updated_at = NOW()'];
  const params: (string | number | boolean)[] = [streamId, event.version];

  if (data.code !== undefined) {
    params.push(data.code);
    updates.push(`code = $${params.length}`);
  }

  if (data.name !== undefined) {
    params.push(data.name);
    updates.push(`name = $${params.length}`);
  }

  if (data.isActive !== undefined) {
    params.push(data.isActive);
    updates.push(`is_active = $${params.length}`);
  }

  await client.query(
    `UPDATE room_types SET ${updates.join(', ')} WHERE id = $1`,
    params
  );
}

/**
 * Handle RoomTypeDeleted event - soft delete the room type
 */
async function handleRoomTypeDeleted(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  await client.query(
    `UPDATE room_types
     SET is_active = false, version = $2, updated_at = NOW()
     WHERE id = $1`,
    [streamId, event.version]
  );
}

/**
 * Get a room type from the read model
 */
export async function getRoomType(
  client: PoolClient,
  roomTypeId: string
): Promise<{
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const result = await client.query<{
    id: string;
    code: string;
    name: string;
    is_active: boolean;
    version: number;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT * FROM room_types WHERE id = $1`,
    [roomTypeId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.is_active,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List all room types from the read model
 */
export async function listRoomTypes(
  client: PoolClient,
  includeInactive: boolean = false
): Promise<Array<{
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}>> {
  let query = 'SELECT * FROM room_types';
  if (!includeInactive) {
    query += ' WHERE is_active = true';
  }
  query += ' ORDER BY code ASC';

  const result = await client.query(query);

  return result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.is_active,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
