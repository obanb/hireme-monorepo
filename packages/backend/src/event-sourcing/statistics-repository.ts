import { getPool } from './database';

export interface ReservationStats {
  totalCount: number;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  totalRevenue: number;
  averageAmount: number;
  averageStayDays: number;
}

export interface ReservationTimelinePoint {
  date: string;
  count: number;
  revenue: number;
}

export interface RoomOccupancyStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  occupancyRate: number;
}

export interface RevenueTimelinePoint {
  month: string;
  revenue: number;
}

export interface StatisticsFilter {
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
}

export interface TimelineFilter {
  dateFrom: string;
  dateTo: string;
  granularity?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export interface RoomTypeRevenue {
  roomType: string;
  revenue: number;
  bookingCount: number;
  avgStayDays: number;
}

export interface OccupancyTimelinePoint {
  date: string;
  occupancyRate: number;
  occupiedRooms: number;
  totalRooms: number;
}

class StatisticsRepository {
  async getReservationStats(filter?: StatisticsFilter): Promise<ReservationStats> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filter?.dateFrom) {
      conditions.push(`check_in_date >= $${paramIdx++}`);
      params.push(filter.dateFrom);
    }
    if (filter?.dateTo) {
      conditions.push(`check_in_date <= $${paramIdx++}`);
      params.push(filter.dateTo);
    }
    if (filter?.currency) {
      conditions.push(`currency = $${paramIdx++}`);
      params.push(filter.currency);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed_count,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled_count,
        COALESCE(SUM(total_price), 0)::float AS total_revenue,
        COALESCE(AVG(total_price), 0)::float AS average_amount,
        COALESCE(AVG(
          CASE WHEN check_in_date IS NOT NULL AND check_out_date IS NOT NULL
            THEN (check_out_date - check_in_date)
            ELSE NULL
          END
        ), 0)::float AS average_stay_days
      FROM reservations ${where}`,
      params
    );

    const row = result.rows[0];
    return {
      totalCount: row.total_count,
      pendingCount: row.pending_count,
      confirmedCount: row.confirmed_count,
      cancelledCount: row.cancelled_count,
      totalRevenue: row.total_revenue,
      averageAmount: row.average_amount,
      averageStayDays: row.average_stay_days,
    };
  }

  async getReservationTimeline(filter: TimelineFilter): Promise<ReservationTimelinePoint[]> {
    const pool = getPool();
    const granularity = filter.granularity || 'DAILY';

    const truncField = granularity === 'DAILY' ? 'day'
      : granularity === 'WEEKLY' ? 'week'
      : 'month';

    const result = await pool.query(
      `SELECT
        date_trunc($1, check_in_date)::date::text AS date,
        COUNT(*)::int AS count,
        COALESCE(SUM(total_price), 0)::float AS revenue
      FROM reservations
      WHERE check_in_date >= $2 AND check_in_date <= $3
      GROUP BY date_trunc($1, check_in_date)
      ORDER BY date_trunc($1, check_in_date)`,
      [truncField, filter.dateFrom, filter.dateTo]
    );

    return result.rows.map((row: { date: string; count: number; revenue: number }) => ({
      date: row.date,
      count: row.count,
      revenue: row.revenue,
    }));
  }

  async getRoomOccupancyStats(): Promise<RoomOccupancyStats> {
    const pool = getPool();

    const result = await pool.query(
      `SELECT
        COUNT(*)::int AS total_rooms,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available_rooms,
        COUNT(*) FILTER (WHERE status = 'OCCUPIED')::int AS occupied_rooms,
        COUNT(*) FILTER (WHERE status = 'MAINTENANCE')::int AS maintenance_rooms
      FROM rooms`
    );

    const row = result.rows[0];
    const totalRooms = row.total_rooms || 0;
    const occupiedRooms = row.occupied_rooms || 0;
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    return {
      totalRooms,
      availableRooms: row.available_rooms,
      occupiedRooms,
      maintenanceRooms: row.maintenance_rooms,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
    };
  }

  async getRevenueTimeline(filter?: StatisticsFilter): Promise<RevenueTimelinePoint[]> {
    const pool = getPool();
    const conditions: string[] = ['total_price IS NOT NULL'];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filter?.dateFrom) {
      conditions.push(`check_in_date >= $${paramIdx++}`);
      params.push(filter.dateFrom);
    }
    if (filter?.dateTo) {
      conditions.push(`check_in_date <= $${paramIdx++}`);
      params.push(filter.dateTo);
    }
    if (filter?.currency) {
      conditions.push(`currency = $${paramIdx++}`);
      params.push(filter.currency);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
        to_char(date_trunc('month', check_in_date), 'YYYY-MM') AS month,
        COALESCE(SUM(total_price), 0)::float AS revenue
      FROM reservations ${where}
      GROUP BY date_trunc('month', check_in_date)
      ORDER BY date_trunc('month', check_in_date)`,
      params
    );

    return result.rows.map((row: { month: string; revenue: number }) => ({
      month: row.month,
      revenue: row.revenue,
    }));
  }

  async getRevenueByRoomType(filter?: StatisticsFilter): Promise<RoomTypeRevenue[]> {
    const pool = getPool();
    const conditions: string[] = ["r.status != 'CANCELLED'", "cardinality(r.room_ids) > 0"];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filter?.dateFrom) { conditions.push(`r.check_in_date >= $${paramIdx++}`); params.push(filter.dateFrom); }
    if (filter?.dateTo) { conditions.push(`r.check_in_date <= $${paramIdx++}`); params.push(filter.dateTo); }
    if (filter?.currency) { conditions.push(`r.currency = $${paramIdx++}`); params.push(filter.currency); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const result = await pool.query(
      `SELECT
        ro.type AS room_type,
        COALESCE(SUM(r.total_price), 0)::float AS revenue,
        COUNT(DISTINCT r.id)::int AS booking_count,
        COALESCE(AVG(
          CASE WHEN r.check_in_date IS NOT NULL AND r.check_out_date IS NOT NULL
            THEN (r.check_out_date - r.check_in_date)
            ELSE NULL END
        ), 0)::float AS avg_stay_days
      FROM reservations r
      JOIN rooms ro ON ro.id = ANY(r.room_ids)
      ${where}
      GROUP BY ro.type
      ORDER BY revenue DESC`,
      params
    );

    return result.rows.map((row: { room_type: string; revenue: number; booking_count: number; avg_stay_days: number }) => ({
      roomType: row.room_type,
      revenue: row.revenue,
      bookingCount: row.booking_count,
      avgStayDays: row.avg_stay_days,
    }));
  }

  async getOccupancyTimeline(filter: TimelineFilter): Promise<OccupancyTimelinePoint[]> {
    const pool = getPool();
    const granularity = filter.granularity || 'DAILY';
    const truncField = granularity === 'DAILY' ? 'day' : granularity === 'WEEKLY' ? 'week' : 'month';

    // Total rooms count
    const roomCount = await pool.query(`SELECT COUNT(*)::int AS total FROM rooms WHERE status != 'MAINTENANCE'`);
    const totalRooms: number = roomCount.rows[0]?.total || 0;
    if (totalRooms === 0) return [];

    // Count reservations active per period bucket
    const result = await pool.query(
      `SELECT
        date_trunc($1, gs.day)::date::text AS date,
        COUNT(DISTINCT r.id)::int AS occupied_rooms
      FROM generate_series($2::date, $3::date, '1 day'::interval) AS gs(day)
      LEFT JOIN reservations r
        ON r.check_in_date <= gs.day
        AND r.check_out_date > gs.day
        AND r.status != 'CANCELLED'
      GROUP BY date_trunc($1, gs.day)
      ORDER BY date_trunc($1, gs.day)`,
      [truncField, filter.dateFrom, filter.dateTo]
    );

    return result.rows.map((row: { date: string; occupied_rooms: number }) => ({
      date: row.date,
      occupiedRooms: row.occupied_rooms,
      totalRooms,
      occupancyRate: Math.round((row.occupied_rooms / totalRooms) * 1000) / 10,
    }));
  }
}

export const statisticsRepository = new StatisticsRepository();
