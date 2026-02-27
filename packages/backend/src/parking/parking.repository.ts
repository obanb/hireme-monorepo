import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../event-sourcing';

export interface ParkingSpaceRow {
  id: string;
  number: number;
  label: string;
  type: string;
  is_active: boolean;
}

export interface ParkingOccupancyRow {
  id: string;
  space_id: string;
  owner_name: string;
  owner_email: string | null;
  license_plate: string;
  from_date: Date;
  to_date: Date | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  released_at: Date | null;
}

export function formatSpace(row: ParkingSpaceRow, occupancy: ParkingOccupancyRow | null = null) {
  return {
    id: row.id,
    number: row.number,
    label: row.label,
    type: row.type,
    isActive: row.is_active,
    currentOccupancy: occupancy ? formatOccupancy(occupancy) : null,
  };
}

export function formatOccupancy(row: ParkingOccupancyRow) {
  return {
    id: row.id,
    spaceId: row.space_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    licensePlate: row.license_plate,
    from: row.from_date?.toISOString(),
    to: row.to_date?.toISOString() ?? null,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at?.toISOString(),
    releasedAt: row.released_at?.toISOString() ?? null,
  };
}

export const parkingRepository = {
  async getSpacesWithOccupancy() {
    const pool = getPool();
    const result = await pool.query<ParkingSpaceRow & {
      occ_id: string | null;
      space_id: string | null;
      owner_name: string | null;
      owner_email: string | null;
      license_plate: string | null;
      from_date: Date | null;
      to_date: Date | null;
      notes: string | null;
      occ_is_active: boolean | null;
      occ_created_at: Date | null;
      released_at: Date | null;
    }>(`
      SELECT
        ps.id, ps.number, ps.label, ps.type, ps.is_active,
        po.id        AS occ_id,
        po.space_id,
        po.owner_name,
        po.owner_email,
        po.license_plate,
        po.from_date,
        po.to_date,
        po.notes,
        po.is_active  AS occ_is_active,
        po.created_at AS occ_created_at,
        po.released_at
      FROM parking_spaces ps
      LEFT JOIN parking_occupancies po
        ON po.space_id = ps.id AND po.is_active = true
      ORDER BY ps.number ASC
    `);

    return result.rows.map((row) => {
      const spaceRow: ParkingSpaceRow = {
        id: row.id,
        number: row.number,
        label: row.label,
        type: row.type,
        is_active: row.is_active,
      };
      const occRow: ParkingOccupancyRow | null = row.occ_id
        ? {
            id: row.occ_id,
            space_id: row.space_id!,
            owner_name: row.owner_name!,
            owner_email: row.owner_email,
            license_plate: row.license_plate!,
            from_date: row.from_date!,
            to_date: row.to_date,
            notes: row.notes,
            is_active: row.occ_is_active!,
            created_at: row.occ_created_at!,
            released_at: row.released_at,
          }
        : null;
      return formatSpace(spaceRow, occRow);
    });
  },

  async getSpaceById(id: string) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ps.*, po.id AS occ_id, po.space_id, po.owner_name, po.owner_email,
              po.license_plate, po.from_date, po.to_date, po.notes,
              po.is_active AS occ_is_active, po.created_at AS occ_created_at, po.released_at
       FROM parking_spaces ps
       LEFT JOIN parking_occupancies po ON po.space_id = ps.id AND po.is_active = true
       WHERE ps.id = $1`,
      [id]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return formatSpace(
      { id: row.id, number: row.number, label: row.label, type: row.type, is_active: row.is_active },
      row.occ_id ? {
        id: row.occ_id, space_id: row.space_id, owner_name: row.owner_name,
        owner_email: row.owner_email, license_plate: row.license_plate,
        from_date: row.from_date, to_date: row.to_date, notes: row.notes,
        is_active: row.occ_is_active, created_at: row.occ_created_at, released_at: row.released_at,
      } : null
    );
  },

  async assign(input: {
    spaceId: string;
    ownerName: string;
    ownerEmail?: string | null;
    licensePlate: string;
    from: string;
    to?: string | null;
    notes?: string | null;
  }): Promise<ReturnType<typeof formatOccupancy>> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check not already occupied
      const check = await client.query(
        `SELECT id FROM parking_occupancies WHERE space_id = $1 AND is_active = true`,
        [input.spaceId]
      );
      if (check.rows.length > 0) {
        throw new Error('Parking space is already occupied');
      }

      const id = uuidv4();
      const result = await client.query<ParkingOccupancyRow>(
        `INSERT INTO parking_occupancies
           (id, space_id, owner_name, owner_email, license_plate, from_date, to_date, notes, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         RETURNING *`,
        [id, input.spaceId, input.ownerName, input.ownerEmail ?? null,
         input.licensePlate, input.from, input.to ?? null, input.notes ?? null]
      );

      await client.query('COMMIT');
      return formatOccupancy(result.rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async release(spaceId: string): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE parking_occupancies
       SET is_active = false, released_at = NOW()
       WHERE space_id = $1 AND is_active = true`,
      [spaceId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async updateOccupancy(occupancyId: string, input: {
    ownerName?: string;
    ownerEmail?: string | null;
    licensePlate?: string;
    from?: string;
    to?: string | null;
    notes?: string | null;
  }): Promise<ReturnType<typeof formatOccupancy> | null> {
    const pool = getPool();
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.ownerName !== undefined) { sets.push(`owner_name = $${idx++}`); values.push(input.ownerName); }
    if ('ownerEmail' in input) { sets.push(`owner_email = $${idx++}`); values.push(input.ownerEmail); }
    if (input.licensePlate !== undefined) { sets.push(`license_plate = $${idx++}`); values.push(input.licensePlate); }
    if (input.from !== undefined) { sets.push(`from_date = $${idx++}`); values.push(input.from); }
    if ('to' in input) { sets.push(`to_date = $${idx++}`); values.push(input.to); }
    if ('notes' in input) { sets.push(`notes = $${idx++}`); values.push(input.notes); }

    if (sets.length === 0) {
      const r = await pool.query<ParkingOccupancyRow>(`SELECT * FROM parking_occupancies WHERE id = $1`, [occupancyId]);
      return r.rows[0] ? formatOccupancy(r.rows[0]) : null;
    }

    values.push(occupancyId);
    const result = await pool.query<ParkingOccupancyRow>(
      `UPDATE parking_occupancies SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] ? formatOccupancy(result.rows[0]) : null;
  },

  async getStats() {
    const pool = getPool();
    const [spacesRes, statsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN EXISTS(
        SELECT 1 FROM parking_occupancies po WHERE po.space_id = ps.id AND po.is_active = true
      ) THEN 1 ELSE 0 END) AS occupied FROM parking_spaces ps WHERE is_active = true`),
      pool.query(`
        SELECT
          COUNT(CASE WHEN DATE(from_date) = CURRENT_DATE THEN 1 END) AS today_arrivals,
          COUNT(CASE WHEN DATE(released_at) = CURRENT_DATE THEN 1 END) AS today_departures
        FROM parking_occupancies
      `),
    ]);

    const total = parseInt(spacesRes.rows[0]?.total ?? '0', 10);
    const occupied = parseInt(spacesRes.rows[0]?.occupied ?? '0', 10);
    const available = total - occupied;

    return {
      total,
      occupied,
      available,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
      todayArrivals: parseInt(statsRes.rows[0]?.today_arrivals ?? '0', 10),
      todayDepartures: parseInt(statsRes.rows[0]?.today_departures ?? '0', 10),
    };
  },

  async getOccupancies(activeOnly = false) {
    const pool = getPool();
    const where = activeOnly ? 'WHERE is_active = true' : '';
    const result = await pool.query<ParkingOccupancyRow>(
      `SELECT * FROM parking_occupancies ${where} ORDER BY created_at DESC LIMIT 200`
    );
    return result.rows.map(formatOccupancy);
  },
};
