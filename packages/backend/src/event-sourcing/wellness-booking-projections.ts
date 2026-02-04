/**
 * WellnessBooking Projections
 */
import { PoolClient } from 'pg';
import { StoredEvent } from './event-store';

export async function applyWellnessBookingProjection(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  switch (event.type) {
    case 'WellnessBookingCreated':
      await handleCreated(client, streamId, event);
      break;
    case 'WellnessBookingUpdated':
      await handleUpdated(client, streamId, event);
      break;
    case 'WellnessBookingCancelled':
      await handleCancelled(client, streamId, event);
      break;
  }
}

async function handleCreated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as {
    reservationId?: string;
    guestName: string;
    serviceId: string;
    therapistId?: string;
    roomTypeId?: string;
    scheduledDate: string;
    scheduledTime: string;
    endTime: string;
    notes?: string;
    price: number;
  };

  await client.query(
    `INSERT INTO wellness_bookings (
      id, reservation_id, guest_name, service_id, therapist_id, room_type_id,
      scheduled_date, scheduled_time, end_time, status, notes, price,
      version, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      reservation_id = EXCLUDED.reservation_id, guest_name = EXCLUDED.guest_name,
      service_id = EXCLUDED.service_id, therapist_id = EXCLUDED.therapist_id,
      room_type_id = EXCLUDED.room_type_id, scheduled_date = EXCLUDED.scheduled_date,
      scheduled_time = EXCLUDED.scheduled_time, end_time = EXCLUDED.end_time,
      status = EXCLUDED.status, notes = EXCLUDED.notes, price = EXCLUDED.price,
      version = EXCLUDED.version, updated_at = NOW()`,
    [
      streamId, data.reservationId ?? null, data.guestName, data.serviceId,
      data.therapistId ?? null, data.roomTypeId ?? null,
      data.scheduledDate, data.scheduledTime, data.endTime,
      'SCHEDULED', data.notes ?? null, data.price, event.version
    ]
  );
}

async function handleUpdated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as {
    therapistId?: string;
    roomTypeId?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    endTime?: string;
    notes?: string;
    status?: string;
  };

  const updates: string[] = ['version = $2', 'updated_at = NOW()'];
  const params: (string | number | null)[] = [streamId, event.version];

  if (data.therapistId !== undefined) { params.push(data.therapistId); updates.push(`therapist_id = $${params.length}`); }
  if (data.roomTypeId !== undefined) { params.push(data.roomTypeId); updates.push(`room_type_id = $${params.length}`); }
  if (data.scheduledDate !== undefined) { params.push(data.scheduledDate); updates.push(`scheduled_date = $${params.length}`); }
  if (data.scheduledTime !== undefined) { params.push(data.scheduledTime); updates.push(`scheduled_time = $${params.length}`); }
  if (data.endTime !== undefined) { params.push(data.endTime); updates.push(`end_time = $${params.length}`); }
  if (data.notes !== undefined) { params.push(data.notes); updates.push(`notes = $${params.length}`); }
  if (data.status !== undefined) { params.push(data.status); updates.push(`status = $${params.length}`); }

  await client.query(`UPDATE wellness_bookings SET ${updates.join(', ')} WHERE id = $1`, params);
}

async function handleCancelled(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  await client.query(
    `UPDATE wellness_bookings SET status = 'CANCELLED', version = $2, updated_at = NOW() WHERE id = $1`,
    [streamId, event.version]
  );
}

export async function getWellnessBooking(client: PoolClient, id: string) {
  const result = await client.query(`SELECT * FROM wellness_bookings WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    reservationId: row.reservation_id,
    guestName: row.guest_name,
    serviceId: row.service_id,
    therapistId: row.therapist_id,
    roomTypeId: row.room_type_id,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    endTime: row.end_time,
    status: row.status,
    notes: row.notes,
    price: parseFloat(row.price),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listWellnessBookings(
  client: PoolClient,
  filter?: {
    scheduledDateFrom?: string;
    scheduledDateTo?: string;
    therapistId?: string;
    roomTypeId?: string;
    serviceId?: string;
    status?: string;
    guestName?: string;
  }
) {
  let query = 'SELECT * FROM wellness_bookings WHERE 1=1';
  const params: (string | null)[] = [];

  if (filter?.scheduledDateFrom) {
    params.push(filter.scheduledDateFrom);
    query += ` AND scheduled_date >= $${params.length}`;
  }
  if (filter?.scheduledDateTo) {
    params.push(filter.scheduledDateTo);
    query += ` AND scheduled_date <= $${params.length}`;
  }
  if (filter?.therapistId) {
    params.push(filter.therapistId);
    query += ` AND therapist_id = $${params.length}`;
  }
  if (filter?.roomTypeId) {
    params.push(filter.roomTypeId);
    query += ` AND room_type_id = $${params.length}`;
  }
  if (filter?.serviceId) {
    params.push(filter.serviceId);
    query += ` AND service_id = $${params.length}`;
  }
  if (filter?.status) {
    params.push(filter.status);
    query += ` AND status = $${params.length}`;
  }
  if (filter?.guestName) {
    params.push(`%${filter.guestName}%`);
    query += ` AND guest_name ILIKE $${params.length}`;
  }

  query += ' ORDER BY scheduled_date ASC, scheduled_time ASC';

  const result = await client.query(query, params);
  return result.rows.map((row) => ({
    id: row.id,
    reservationId: row.reservation_id,
    guestName: row.guest_name,
    serviceId: row.service_id,
    therapistId: row.therapist_id,
    roomTypeId: row.room_type_id,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    endTime: row.end_time,
    status: row.status,
    notes: row.notes,
    price: parseFloat(row.price),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
