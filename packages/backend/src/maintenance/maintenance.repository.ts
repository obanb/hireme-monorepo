import { getPool } from '../event-sourcing/database';

export interface MaintenanceRecord {
  id: string;
  roomId: string;
  roomNumber: string;
  roomName: string;
  status: 'DIRTY' | 'CLEAN' | 'MAINTENANCE' | 'CHECKED';
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface UpdateMaintenanceInput {
  status: 'DIRTY' | 'CLEAN' | 'MAINTENANCE' | 'CHECKED';
  notes?: string | null;
  updatedBy?: string | null;
}

const SELECT_FIELDS = `
  COALESCE(m.id::text, gen_random_uuid()::text) as id,
  r.id::text as "roomId",
  r.room_number as "roomNumber",
  r.name as "roomName",
  COALESCE(m.status, 'DIRTY') as status,
  m.notes,
  m.updated_by as "updatedBy",
  COALESCE(m.updated_at, NOW()) as "updatedAt"
`;

export const maintenanceRepository = {
  /**
   * Get all rooms with their maintenance status.
   * Rooms without a maintenance record get DIRTY as default.
   */
  async getAllRooms(): Promise<MaintenanceRecord[]> {
    const pool = getPool();
    const result = await pool.query(`
      SELECT ${SELECT_FIELDS}
      FROM rooms r
      LEFT JOIN room_maintenance m ON m.room_id = r.id
      ORDER BY r.room_number
    `);
    return result.rows;
  },

  async getByRoomId(roomId: string): Promise<MaintenanceRecord | null> {
    const pool = getPool();
    const result = await pool.query(`
      SELECT ${SELECT_FIELDS}
      FROM rooms r
      LEFT JOIN room_maintenance m ON m.room_id = r.id
      WHERE r.id = $1
    `, [roomId]);
    return result.rows[0] ?? null;
  },

  async upsert(roomId: string, input: UpdateMaintenanceInput): Promise<MaintenanceRecord> {
    const pool = getPool();
    await pool.query(`
      INSERT INTO room_maintenance (id, room_id, status, notes, updated_by, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
      ON CONFLICT (room_id) DO UPDATE SET
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    `, [roomId, input.status, input.notes ?? null, input.updatedBy ?? null]);

    const record = await this.getByRoomId(roomId);
    if (!record) throw new Error('Room not found');
    return record;
  },

  async bulkUpsert(roomIds: string[], input: UpdateMaintenanceInput): Promise<MaintenanceRecord[]> {
    const results: MaintenanceRecord[] = [];
    for (const roomId of roomIds) {
      results.push(await this.upsert(roomId, input));
    }
    return results;
  },
};
