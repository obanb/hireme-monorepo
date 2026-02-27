import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../event-sourcing/database';

export interface RentalItemRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  total_quantity: number;
  daily_rate: string | null;
  currency: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RentalBookingRow {
  id: string;
  item_id: string;
  guest_name: string;
  guest_id: string | null;
  quantity: number;
  status: string;
  borrowed_at: Date;
  due_date: string | null;
  returned_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// ── Item CRUD ──────────────────────────────────────────────────────────────

export async function getRentalItem(id: string): Promise<RentalItemRow | null> {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM rental_items WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function listRentalItems(filter?: {
  category?: string;
  isActive?: boolean;
}): Promise<RentalItemRow[]> {
  const pool = getPool();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter?.category) {
    conditions.push(`category = $${idx++}`);
    params.push(filter.category);
  }
  if (filter?.isActive !== undefined) {
    conditions.push(`is_active = $${idx++}`);
    params.push(filter.isActive);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM rental_items ${where} ORDER BY name ASC`,
    params
  );
  return result.rows;
}

export async function createRentalItem(data: {
  name: string;
  description?: string | null;
  category: string;
  imageUrl?: string | null;
  totalQuantity: number;
  dailyRate?: number | null;
  currency?: string | null;
}): Promise<RentalItemRow> {
  const pool = getPool();
  const id = uuidv4();
  const result = await pool.query(
    `INSERT INTO rental_items
       (id, name, description, category, image_url, total_quantity, daily_rate, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      data.name,
      data.description ?? null,
      data.category,
      data.imageUrl ?? null,
      data.totalQuantity,
      data.dailyRate ?? null,
      data.currency ?? 'EUR',
    ]
  );
  return result.rows[0];
}

export async function updateRentalItem(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    category?: string;
    imageUrl?: string | null;
    totalQuantity?: number;
    dailyRate?: number | null;
    currency?: string | null;
    isActive?: boolean;
  }
): Promise<RentalItemRow | null> {
  const pool = getPool();
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name); }
  if (data.description !== undefined) { sets.push(`description = $${idx++}`); params.push(data.description); }
  if (data.category !== undefined) { sets.push(`category = $${idx++}`); params.push(data.category); }
  if (data.imageUrl !== undefined) { sets.push(`image_url = $${idx++}`); params.push(data.imageUrl); }
  if (data.totalQuantity !== undefined) { sets.push(`total_quantity = $${idx++}`); params.push(data.totalQuantity); }
  if (data.dailyRate !== undefined) { sets.push(`daily_rate = $${idx++}`); params.push(data.dailyRate); }
  if (data.currency !== undefined) { sets.push(`currency = $${idx++}`); params.push(data.currency); }
  if (data.isActive !== undefined) { sets.push(`is_active = $${idx++}`); params.push(data.isActive); }

  if (!sets.length) return getRentalItem(id);

  sets.push(`updated_at = NOW()`);
  params.push(id);
  const result = await pool.query(
    `UPDATE rental_items SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return result.rows[0] ?? null;
}

export async function deleteRentalItem(id: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query('DELETE FROM rental_items WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// ── Available quantity ──────────────────────────────────────────────────────

export async function getAvailableQuantity(itemId: string): Promise<number> {
  const pool = getPool();
  const itemRes = await pool.query('SELECT total_quantity FROM rental_items WHERE id = $1', [itemId]);
  if (!itemRes.rows[0]) return 0;
  const total: number = itemRes.rows[0].total_quantity;

  const activeRes = await pool.query(
    `SELECT COALESCE(SUM(quantity), 0) AS rented
     FROM rental_bookings
     WHERE item_id = $1 AND status = 'ACTIVE'`,
    [itemId]
  );
  const rented = parseInt(activeRes.rows[0].rented, 10) || 0;
  return Math.max(0, total - rented);
}

// ── Booking CRUD ────────────────────────────────────────────────────────────

export async function getRentalBooking(id: string): Promise<RentalBookingRow | null> {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM rental_bookings WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function listRentalBookings(filter?: {
  status?: string;
  itemId?: string;
}): Promise<RentalBookingRow[]> {
  const pool = getPool();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filter.status);
  }
  if (filter?.itemId) {
    conditions.push(`item_id = $${idx++}`);
    params.push(filter.itemId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM rental_bookings ${where} ORDER BY borrowed_at DESC`,
    params
  );
  return result.rows;
}

export async function createRentalBooking(data: {
  itemId: string;
  guestName: string;
  guestId?: string | null;
  quantity: number;
  dueDate?: string | null;
  notes?: string | null;
}): Promise<RentalBookingRow> {
  const pool = getPool();
  const id = uuidv4();
  const result = await pool.query(
    `INSERT INTO rental_bookings
       (id, item_id, guest_name, guest_id, quantity, due_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      id,
      data.itemId,
      data.guestName,
      data.guestId ?? null,
      data.quantity,
      data.dueDate ?? null,
      data.notes ?? null,
    ]
  );
  return result.rows[0];
}

export async function updateRentalBooking(
  id: string,
  data: { status?: string; notes?: string | null }
): Promise<RentalBookingRow | null> {
  const pool = getPool();
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (data.status !== undefined) { sets.push(`status = $${idx++}`); params.push(data.status); }
  if (data.notes !== undefined) { sets.push(`notes = $${idx++}`); params.push(data.notes); }

  if (!sets.length) return getRentalBooking(id);

  sets.push(`updated_at = NOW()`);
  params.push(id);
  const result = await pool.query(
    `UPDATE rental_bookings SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return result.rows[0] ?? null;
}

export async function returnRentalBooking(bookingId: string): Promise<RentalBookingRow | null> {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE rental_bookings
     SET status = 'RETURNED', returned_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [bookingId]
  );
  return result.rows[0] ?? null;
}
