import { getPool } from './database';

export interface ActivityEvent {
  id: number;
  streamId: string;
  version: number;
  type: string;
  data: string;
  metadata: string | null;
  occurredAt: string;
  guestName: string | null;
}

class ActivityRepository {
  async getRecentActivity(limit = 30): Promise<ActivityEvent[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
        e.id, e.stream_id AS "streamId", e.version, e.type,
        e.data::text AS data, e.metadata::text AS metadata,
        e.occurred_at AS "occurredAt",
        r.guest_name AS "guestName"
      FROM events e
      LEFT JOIN reservations r ON r.id = e.stream_id
      ORDER BY e.occurred_at DESC
      LIMIT $1`,
      [limit]
    );
    return result.rows as ActivityEvent[];
  }

  async getGuestActivity(email: string, limit = 50): Promise<ActivityEvent[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
        e.id, e.stream_id AS "streamId", e.version, e.type,
        e.data::text AS data, e.metadata::text AS metadata,
        e.occurred_at AS "occurredAt",
        r.guest_name AS "guestName"
      FROM events e
      JOIN reservations r ON r.id = e.stream_id
      WHERE r.guest_email = $1
      ORDER BY e.occurred_at DESC
      LIMIT $2`,
      [email, limit]
    );
    return result.rows as ActivityEvent[];
  }
}

export const activityRepository = new ActivityRepository();
