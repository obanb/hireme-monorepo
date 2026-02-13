/**
 * Guest Projections
 */
import { PoolClient } from 'pg';
import { StoredEvent } from './event-store';
import { GuestAddress } from './guest-aggregate';

export async function applyGuestProjection(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  switch (event.type) {
    case 'GuestCreated':
      await handleCreated(client, streamId, event);
      break;
    case 'GuestUpdated':
      await handleUpdated(client, streamId, event);
      break;
    case 'GuestDeleted':
      await handleDeleted(client, streamId, event);
      break;
  }
}

async function handleCreated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: string;
    birthPlace?: string;
    nationality?: string;
    citizenship?: string;
    passportNumber?: string;
    visaNumber?: string;
    purposeOfStay?: string;
    homeAddress?: Partial<GuestAddress>;
    notes?: string;
  };

  await client.query(
    `INSERT INTO guests (
      id, email, first_name, last_name, phone, date_of_birth, birth_place,
      nationality, citizenship, passport_number, visa_number, purpose_of_stay,
      home_street, home_city, home_postal_code, home_country,
      notes, is_active, version, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, $18, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone, date_of_birth = EXCLUDED.date_of_birth, birth_place = EXCLUDED.birth_place,
      nationality = EXCLUDED.nationality, citizenship = EXCLUDED.citizenship,
      passport_number = EXCLUDED.passport_number, visa_number = EXCLUDED.visa_number,
      purpose_of_stay = EXCLUDED.purpose_of_stay, home_street = EXCLUDED.home_street,
      home_city = EXCLUDED.home_city, home_postal_code = EXCLUDED.home_postal_code,
      home_country = EXCLUDED.home_country, notes = EXCLUDED.notes,
      is_active = EXCLUDED.is_active, version = EXCLUDED.version, updated_at = NOW()`,
    [
      streamId,
      data.email,
      data.firstName ?? null,
      data.lastName ?? null,
      data.phone ?? null,
      data.dateOfBirth ?? null,
      data.birthPlace ?? null,
      data.nationality ?? null,
      data.citizenship ?? null,
      data.passportNumber ?? null,
      data.visaNumber ?? null,
      data.purposeOfStay ?? null,
      data.homeAddress?.street ?? null,
      data.homeAddress?.city ?? null,
      data.homeAddress?.postalCode ?? null,
      data.homeAddress?.country ?? null,
      data.notes ?? null,
      event.version,
    ]
  );
}

async function handleUpdated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
    birthPlace?: string | null;
    nationality?: string | null;
    citizenship?: string | null;
    passportNumber?: string | null;
    visaNumber?: string | null;
    purposeOfStay?: string | null;
    homeAddress?: Partial<GuestAddress>;
    notes?: string | null;
  };

  const updates: string[] = ['version = $2', 'updated_at = NOW()'];
  const params: (string | number | boolean | null)[] = [streamId, event.version];

  if (data.email !== undefined) { params.push(data.email); updates.push(`email = $${params.length}`); }
  if (data.firstName !== undefined) { params.push(data.firstName); updates.push(`first_name = $${params.length}`); }
  if (data.lastName !== undefined) { params.push(data.lastName); updates.push(`last_name = $${params.length}`); }
  if (data.phone !== undefined) { params.push(data.phone); updates.push(`phone = $${params.length}`); }
  if (data.dateOfBirth !== undefined) { params.push(data.dateOfBirth); updates.push(`date_of_birth = $${params.length}`); }
  if (data.birthPlace !== undefined) { params.push(data.birthPlace); updates.push(`birth_place = $${params.length}`); }
  if (data.nationality !== undefined) { params.push(data.nationality); updates.push(`nationality = $${params.length}`); }
  if (data.citizenship !== undefined) { params.push(data.citizenship); updates.push(`citizenship = $${params.length}`); }
  if (data.passportNumber !== undefined) { params.push(data.passportNumber); updates.push(`passport_number = $${params.length}`); }
  if (data.visaNumber !== undefined) { params.push(data.visaNumber); updates.push(`visa_number = $${params.length}`); }
  if (data.purposeOfStay !== undefined) { params.push(data.purposeOfStay); updates.push(`purpose_of_stay = $${params.length}`); }
  if (data.homeAddress?.street !== undefined) { params.push(data.homeAddress.street); updates.push(`home_street = $${params.length}`); }
  if (data.homeAddress?.city !== undefined) { params.push(data.homeAddress.city); updates.push(`home_city = $${params.length}`); }
  if (data.homeAddress?.postalCode !== undefined) { params.push(data.homeAddress.postalCode); updates.push(`home_postal_code = $${params.length}`); }
  if (data.homeAddress?.country !== undefined) { params.push(data.homeAddress.country); updates.push(`home_country = $${params.length}`); }
  if (data.notes !== undefined) { params.push(data.notes); updates.push(`notes = $${params.length}`); }

  await client.query(`UPDATE guests SET ${updates.join(', ')} WHERE id = $1`, params);
}

async function handleDeleted(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  await client.query(
    `UPDATE guests SET is_active = false, version = $2, updated_at = NOW() WHERE id = $1`,
    [streamId, event.version]
  );
}

export async function getGuest(client: PoolClient, id: string) {
  const result = await client.query(`SELECT * FROM guests WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  return mapRowToGuest(result.rows[0]);
}

export async function getGuestByEmail(client: PoolClient, email: string) {
  const result = await client.query(`SELECT * FROM guests WHERE email = $1 AND is_active = true`, [email]);
  if (result.rows.length === 0) return null;
  return mapRowToGuest(result.rows[0]);
}

export async function listGuests(
  client: PoolClient,
  options: {
    filter?: {
      email?: string;
      name?: string;
      nationality?: string;
      passportNumber?: string;
    };
    limit?: number;
    offset?: number;
  } = {}
) {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options.filter?.email) {
    params.push(`%${options.filter.email}%`);
    conditions.push(`email ILIKE $${params.length}`);
  }

  if (options.filter?.name) {
    params.push(`%${options.filter.name}%`);
    conditions.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`);
  }

  if (options.filter?.nationality) {
    params.push(`%${options.filter.nationality}%`);
    conditions.push(`nationality ILIKE $${params.length}`);
  }

  if (options.filter?.passportNumber) {
    params.push(`%${options.filter.passportNumber}%`);
    conditions.push(`passport_number ILIKE $${params.length}`);
  }

  let query = 'SELECT * FROM guests';
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  if (options.limit) {
    params.push(options.limit);
    query += ` LIMIT $${params.length}`;
  }
  if (options.offset) {
    params.push(options.offset);
    query += ` OFFSET $${params.length}`;
  }

  const result = await client.query(query, params);
  return result.rows.map(mapRowToGuest);
}

function mapRowToGuest(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    email: row.email as string,
    firstName: row.first_name as string | null,
    lastName: row.last_name as string | null,
    phone: row.phone as string | null,
    dateOfBirth: row.date_of_birth ? (row.date_of_birth as Date).toISOString().split('T')[0] : null,
    birthPlace: row.birth_place as string | null,
    nationality: row.nationality as string | null,
    citizenship: row.citizenship as string | null,
    passportNumber: row.passport_number as string | null,
    visaNumber: row.visa_number as string | null,
    purposeOfStay: row.purpose_of_stay as string | null,
    homeStreet: row.home_street as string | null,
    homeCity: row.home_city as string | null,
    homePostalCode: row.home_postal_code as string | null,
    homeCountry: row.home_country as string | null,
    notes: row.notes as string | null,
    isActive: row.is_active as boolean,
    version: row.version as number,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}
