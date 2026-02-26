/**
 * Account Projections
 *
 * Transforms account events into the accounts read model.
 */
import { PoolClient } from 'pg';
import { StoredEvent } from './event-store';

export async function applyAccountProjection(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<number | null> {
  switch (event.type) {
    case 'AccountCreated':
      return handleAccountCreated(client, streamId, event);
    default:
      console.warn(`Unknown event type for account projection: ${event.type}`);
      return null;
  }
}

async function handleAccountCreated(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<number> {
  const data = event.data as {
    reservationId: string;
    totalPrice: number;
    payedPrice: number;
    currency: string | null;
  };

  const result = await client.query<{ id: number }>(
    `INSERT INTO accounts (stream_id, reservation_id, total_price, payed_price, currency, version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (stream_id) DO UPDATE SET
       total_price = EXCLUDED.total_price,
       payed_price = EXCLUDED.payed_price,
       currency = EXCLUDED.currency,
       version = EXCLUDED.version,
       updated_at = NOW()
     RETURNING id`,
    [
      streamId,
      data.reservationId,
      data.totalPrice,
      data.payedPrice,
      data.currency,
      event.version,
    ]
  );

  return result.rows[0].id;
}

export async function getAccount(
  client: PoolClient,
  id: number
): Promise<AccountRow | null> {
  const result = await client.query<AccountRow>(
    `SELECT * FROM accounts WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

export async function getAccountByStreamId(
  client: PoolClient,
  streamId: string
): Promise<AccountRow | null> {
  const result = await client.query<AccountRow>(
    `SELECT * FROM accounts WHERE stream_id = $1`,
    [streamId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

export async function getAccountByReservationId(
  client: PoolClient,
  reservationId: string
): Promise<AccountRow | null> {
  const result = await client.query<AccountRow>(
    `SELECT * FROM accounts WHERE reservation_id = $1 LIMIT 1`,
    [reservationId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

export async function listAccounts(
  client: PoolClient,
  options?: {
    filter?: {
      reservationId?: string;
      minTotal?: number;
      maxTotal?: number;
      createdFrom?: string;
      createdTo?: string;
    };
    limit?: number;
    offset?: number;
  }
): Promise<AccountRow[]> {
  const params: (string | number)[] = [];
  let query = 'SELECT * FROM accounts';
  const conditions: string[] = [];
  const filter = options?.filter;

  if (filter?.reservationId) {
    params.push(filter.reservationId);
    conditions.push(`reservation_id = $${params.length}`);
  }
  if (filter?.minTotal !== undefined) {
    params.push(filter.minTotal);
    conditions.push(`total_price >= $${params.length}`);
  }
  if (filter?.maxTotal !== undefined) {
    params.push(filter.maxTotal);
    conditions.push(`total_price <= $${params.length}`);
  }
  if (filter?.createdFrom) {
    params.push(filter.createdFrom);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (filter?.createdTo) {
    params.push(filter.createdTo);
    conditions.push(`created_at <= $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY id DESC';

  if (options?.limit) {
    params.push(options.limit);
    query += ` LIMIT $${params.length}`;
  }
  if (options?.offset) {
    params.push(options.offset);
    query += ` OFFSET $${params.length}`;
  }

  const result = await client.query<AccountRow>(query, params);
  return result.rows;
}

export interface AccountRow {
  id: number;
  stream_id: string;
  reservation_id: string;
  total_price: number;
  payed_price: number;
  currency: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}
