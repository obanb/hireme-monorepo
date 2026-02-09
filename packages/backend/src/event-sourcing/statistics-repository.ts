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

class StatisticsRepository {
  async getReservationStats(filter?: StatisticsFilter): Promise<ReservationStats> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filter?.dateFrom) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(filter.dateFrom);
    }
    if (filter?.dateTo) {
      conditions.push(`created_at <= $${paramIdx++}`);
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
        COALESCE(SUM(total_amount), 0)::float AS total_revenue,
        COALESCE(AVG(total_amount), 0)::float AS average_amount,
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
        date_trunc($1, created_at)::date::text AS date,
        COUNT(*)::int AS count,
        COALESCE(SUM(total_amount), 0)::float AS revenue
      FROM reservations
      WHERE created_at >= $2 AND created_at <= $3
      GROUP BY date_trunc($1, created_at)
      ORDER BY date_trunc($1, created_at)`,
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
    const conditions: string[] = ['total_amount IS NOT NULL'];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filter?.dateFrom) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(filter.dateFrom);
    }
    if (filter?.dateTo) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(filter.dateTo);
    }
    if (filter?.currency) {
      conditions.push(`currency = $${paramIdx++}`);
      params.push(filter.currency);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
        COALESCE(SUM(total_amount), 0)::float AS revenue
      FROM reservations ${where}
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at)`,
      params
    );

    return result.rows.map((row: { month: string; revenue: number }) => ({
      month: row.month,
      revenue: row.revenue,
    }));
  }
}

export const statisticsRepository = new StatisticsRepository();
