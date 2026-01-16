/**
 * Projections
 *
 * Transforms events into read models optimized for querying.
 * These projections run synchronously within the same transaction as event writes.
 */
import { PoolClient } from 'pg';
import { StoredEvent } from './event-store';

/**
 * Apply a projection for a reservation event
 * Updates the reservations read model based on the event type
 */
export async function applyReservationProjection(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  switch (event.type) {
    case 'ReservationCreated':
      await handleReservationCreated(client, streamId, event);
      break;
    case 'ReservationConfirmed':
      await handleReservationConfirmed(client, streamId, event);
      break;
    case 'ReservationCancelled':
      await handleReservationCancelled(client, streamId, event);
      break;
    default:
      console.warn(`Unknown event type for projection: ${event.type}`);
  }
}

/**
 * Handle ReservationCreated event - insert a new reservation read model
 */
async function handleReservationCreated(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  const data = event.data as {
    reservationId: string;
    bookingDetails?: {
      originId?: string;
      totalAmount?: number;
      currency?: string;
      arrivalTime?: string;
      departureTime?: string;
      customer?: {
        firstName?: string;
        lastName?: string;
      };
    };
  };

  const booking = data.bookingDetails || {};
  const guestName = booking.customer
    ? `${booking.customer.firstName || ''} ${booking.customer.lastName || ''}`.trim()
    : 'Guest';

  await client.query(
    `INSERT INTO reservations (
      id, origin_id, guest_name, status, check_in_date, check_out_date,
      total_amount, currency, version, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      origin_id = EXCLUDED.origin_id,
      guest_name = EXCLUDED.guest_name,
      status = EXCLUDED.status,
      check_in_date = EXCLUDED.check_in_date,
      check_out_date = EXCLUDED.check_out_date,
      total_amount = EXCLUDED.total_amount,
      currency = EXCLUDED.currency,
      version = EXCLUDED.version,
      updated_at = NOW()`,
    [
      streamId,
      booking.originId || null,
      guestName,
      'PENDING',
      booking.arrivalTime ? new Date(booking.arrivalTime).toISOString().split('T')[0] : null,
      booking.departureTime ? new Date(booking.departureTime).toISOString().split('T')[0] : null,
      booking.totalAmount || null,
      booking.currency || 'USD',
      event.version,
    ]
  );
}

/**
 * Handle ReservationConfirmed event - update the reservation status to confirmed
 */
async function handleReservationConfirmed(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  await client.query(
    `UPDATE reservations
     SET status = 'CONFIRMED', version = $2, updated_at = NOW()
     WHERE id = $1`,
    [streamId, event.version]
  );
}

/**
 * Handle ReservationCancelled event - update the reservation status
 */
async function handleReservationCancelled(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  await client.query(
    `UPDATE reservations
     SET status = 'CANCELLED', version = $2, updated_at = NOW()
     WHERE id = $1`,
    [streamId, event.version]
  );
}

/**
 * Get a reservation from the read model
 */
export async function getReservation(
  client: PoolClient,
  reservationId: string
): Promise<{
  id: string;
  originId: string | null;
  guestName: string | null;
  status: string;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  totalAmount: number | null;
  currency: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const result = await client.query<{
    id: string;
    origin_id: string | null;
    guest_name: string | null;
    status: string;
    check_in_date: Date | null;
    check_out_date: Date | null;
    total_amount: number | null;
    currency: string | null;
    version: number;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT * FROM reservations WHERE id = $1`,
    [reservationId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    originId: row.origin_id,
    guestName: row.guest_name,
    status: row.status,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    totalAmount: row.total_amount,
    currency: row.currency,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
