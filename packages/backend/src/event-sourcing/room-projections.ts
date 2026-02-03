/**
 * Room Projections
 *
 * Transforms events into read models optimized for querying.
 * These projections run synchronously within the same transaction as event writes.
 */
import { PoolClient } from 'pg';
import { StoredEvent } from './event-store';
import { RoomType, RoomStatus } from './room-aggregate';

/**
 * Apply a projection for a room event
 * Updates the rooms read model based on the event type
 */
export async function applyRoomProjection(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  switch (event.type) {
    case 'RoomCreated':
      await handleRoomCreated(client, streamId, event);
      break;
    case 'RoomUpdated':
      await handleRoomUpdated(client, streamId, event);
      break;
    case 'RoomStatusChanged':
      await handleRoomStatusChanged(client, streamId, event);
      break;
    default:
      // Ignore unknown event types for room projections
      break;
  }
}

/**
 * Handle RoomCreated event - insert a new room read model
 */
async function handleRoomCreated(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  const data = event.data as {
    roomId: string;
    name: string;
    roomNumber: string;
    type: RoomType;
    capacity: number;
    color?: string;
    roomTypeId?: string;
    rateCodeId?: string;
  };

  await client.query(
    `INSERT INTO rooms (
      id, name, room_number, type, capacity, status, color, room_type_id, rate_code_id, version, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      room_number = EXCLUDED.room_number,
      type = EXCLUDED.type,
      capacity = EXCLUDED.capacity,
      color = EXCLUDED.color,
      room_type_id = EXCLUDED.room_type_id,
      rate_code_id = EXCLUDED.rate_code_id,
      version = EXCLUDED.version,
      updated_at = NOW()`,
    [
      streamId,
      data.name,
      data.roomNumber,
      data.type,
      data.capacity,
      'AVAILABLE',
      data.color || '#3b82f6',
      data.roomTypeId || null,
      data.rateCodeId || null,
      event.version,
    ]
  );
}

/**
 * Handle RoomUpdated event - update room details
 */
async function handleRoomUpdated(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  const data = event.data as {
    roomId: string;
    name?: string;
    roomNumber?: string;
    type?: RoomType;
    capacity?: number;
    color?: string;
    roomTypeId?: string | null;
    rateCodeId?: string | null;
  };

  const updates: string[] = ['version = $2', 'updated_at = NOW()'];
  const params: (string | number | null)[] = [streamId, event.version];

  if (data.name !== undefined) {
    params.push(data.name);
    updates.push(`name = $${params.length}`);
  }

  if (data.roomNumber !== undefined) {
    params.push(data.roomNumber);
    updates.push(`room_number = $${params.length}`);
  }

  if (data.type !== undefined) {
    params.push(data.type);
    updates.push(`type = $${params.length}`);
  }

  if (data.capacity !== undefined) {
    params.push(data.capacity);
    updates.push(`capacity = $${params.length}`);
  }

  if (data.color !== undefined) {
    params.push(data.color);
    updates.push(`color = $${params.length}`);
  }

  if (data.roomTypeId !== undefined) {
    params.push(data.roomTypeId);
    updates.push(`room_type_id = $${params.length}`);
  }

  if (data.rateCodeId !== undefined) {
    params.push(data.rateCodeId);
    updates.push(`rate_code_id = $${params.length}`);
  }

  await client.query(
    `UPDATE rooms SET ${updates.join(', ')} WHERE id = $1`,
    params
  );
}

/**
 * Handle RoomStatusChanged event - update the room status
 */
async function handleRoomStatusChanged(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  const data = event.data as {
    status: RoomStatus;
  };

  await client.query(
    `UPDATE rooms
     SET status = $2, version = $3, updated_at = NOW()
     WHERE id = $1`,
    [streamId, data.status, event.version]
  );
}

/**
 * Get a room from the read model
 */
export async function getRoom(
  client: PoolClient,
  roomId: string
): Promise<{
  id: string;
  name: string;
  roomNumber: string;
  type: RoomType;
  capacity: number;
  status: RoomStatus;
  color: string;
  roomTypeId: string | null;
  rateCodeId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const result = await client.query<{
    id: string;
    name: string;
    room_number: string;
    type: RoomType;
    capacity: number;
    status: RoomStatus;
    color: string;
    room_type_id: string | null;
    rate_code_id: string | null;
    version: number;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT * FROM rooms WHERE id = $1`,
    [roomId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    roomNumber: row.room_number,
    type: row.type,
    capacity: row.capacity,
    status: row.status,
    color: row.color,
    roomTypeId: row.room_type_id,
    rateCodeId: row.rate_code_id,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
