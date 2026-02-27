import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../event-sourcing';

export interface TierRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  min_reservations: number | null;
  min_spend: string | null;
  color: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export function formatTier(row: TierRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    minReservations: row.min_reservations,
    minSpend: row.min_spend !== null ? parseFloat(row.min_spend) : null,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at?.toISOString(),
    updatedAt: row.updated_at?.toISOString(),
  };
}

export const tierRepository = {
  async findAll(): Promise<TierRow[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM tiers ORDER BY sort_order ASC, created_at ASC');
    return result.rows;
  },

  async findById(id: string): Promise<TierRow | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM tiers WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  },

  async create(input: {
    code: string;
    name: string;
    description?: string | null;
    minReservations?: number | null;
    minSpend?: number | null;
    color: string;
    sortOrder?: number | null;
  }): Promise<TierRow> {
    const pool = getPool();
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO tiers (id, code, name, description, min_reservations, min_spend, color, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        input.code,
        input.name,
        input.description ?? null,
        input.minReservations ?? null,
        input.minSpend ?? null,
        input.color,
        input.sortOrder ?? 0,
      ]
    );
    return result.rows[0];
  },

  async update(
    id: string,
    input: Partial<{
      code: string;
      name: string;
      description: string | null;
      minReservations: number | null;
      minSpend: number | null;
      color: string;
      sortOrder: number;
    }>
  ): Promise<TierRow | null> {
    const pool = getPool();
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.code !== undefined) { sets.push(`code = $${idx++}`); values.push(input.code); }
    if (input.name !== undefined) { sets.push(`name = $${idx++}`); values.push(input.name); }
    if ('description' in input) { sets.push(`description = $${idx++}`); values.push(input.description); }
    if ('minReservations' in input) { sets.push(`min_reservations = $${idx++}`); values.push(input.minReservations); }
    if ('minSpend' in input) { sets.push(`min_spend = $${idx++}`); values.push(input.minSpend); }
    if (input.color !== undefined) { sets.push(`color = $${idx++}`); values.push(input.color); }
    if (input.sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); values.push(input.sortOrder); }

    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE tiers SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query('DELETE FROM tiers WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async computeGuestTier(email: string): Promise<{
    tier: ReturnType<typeof formatTier> | null;
    reservationCount: number;
    totalSpend: number;
  }> {
    const pool = getPool();

    const statsResult = await pool.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(total_price), 0)::float AS spend
       FROM reservations
       WHERE guest_email = $1 AND status != 'CANCELLED'`,
      [email]
    );

    const reservationCount: number = statsResult.rows[0]?.count ?? 0;
    const totalSpend: number = statsResult.rows[0]?.spend ?? 0;

    // Best tier = highest sort_order where ALL defined thresholds are met
    const tiersResult = await pool.query(
      `SELECT * FROM tiers ORDER BY sort_order DESC, min_reservations DESC NULLS LAST, min_spend DESC NULLS LAST`
    );

    let bestTier: TierRow | null = null;
    for (const tier of tiersResult.rows as TierRow[]) {
      const meetsReservations = tier.min_reservations === null || reservationCount >= tier.min_reservations;
      const meetsSpend = tier.min_spend === null || totalSpend >= parseFloat(tier.min_spend);
      if (meetsReservations && meetsSpend) {
        bestTier = tier;
        break;
      }
    }

    return {
      tier: bestTier ? formatTier(bestTier) : null,
      reservationCount,
      totalSpend,
    };
  },
};
