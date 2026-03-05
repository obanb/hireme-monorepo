import { getPool } from './database';

export interface ForecastGuest {
  id: string;
  guestName: string | null;
  guestEmail: string | null;
  roomIds: string[];
  status: string;
}

export interface DayForecast {
  date: string;
  checkIns: number;
  checkOuts: number;
  inHouseGuests: number;
  arrivals: ForecastGuest[];
  departures: ForecastGuest[];
}

class ForecastRepository {
  async getReceptionForecast(days = 3): Promise<DayForecast[]> {
    const pool = getPool();
    const safeDays = Math.min(Math.max(days, 1), 14);

    // Get arrivals per day
    const arrivalsResult = await pool.query(
      `SELECT
        id,
        check_in_date::text AS date,
        COALESCE(guest_name, guest_email) AS guest_name,
        guest_email,
        COALESCE(room_ids, '{}') AS room_ids,
        status
      FROM reservations
      WHERE check_in_date >= CURRENT_DATE
        AND check_in_date < CURRENT_DATE + $1::int * INTERVAL '1 day'
        AND status != 'CANCELLED'
      ORDER BY check_in_date`,
      [safeDays]
    );

    // Get departures per day
    const departuresResult = await pool.query(
      `SELECT
        id,
        check_out_date::text AS date,
        COALESCE(guest_name, guest_email) AS guest_name,
        guest_email,
        COALESCE(room_ids, '{}') AS room_ids,
        status
      FROM reservations
      WHERE check_out_date >= CURRENT_DATE
        AND check_out_date < CURRENT_DATE + $1::int * INTERVAL '1 day'
        AND status != 'CANCELLED'
      ORDER BY check_out_date`,
      [safeDays]
    );

    // Get in-house count per day
    const inHouseResult = await pool.query(
      `SELECT
        gs.day::text AS date,
        COUNT(DISTINCT r.id)::int AS in_house
      FROM generate_series(CURRENT_DATE, CURRENT_DATE + ($1::int - 1) * INTERVAL '1 day', '1 day') AS gs(day)
      LEFT JOIN reservations r
        ON r.check_in_date <= gs.day
        AND r.check_out_date > gs.day
        AND r.status != 'CANCELLED'
      GROUP BY gs.day
      ORDER BY gs.day`,
      [safeDays]
    );

    // Build day map
    const arrivalsByDate = new Map<string, ForecastGuest[]>();
    const departuresByDate = new Map<string, ForecastGuest[]>();
    const inHouseByDate = new Map<string, number>();

    for (const row of arrivalsResult.rows) {
      const list = arrivalsByDate.get(row.date) ?? [];
      list.push({
        id: row.id,
        guestName: row.guest_name ?? null,
        guestEmail: row.guest_email ?? null,
        roomIds: row.room_ids ?? [],
        status: row.status,
      });
      arrivalsByDate.set(row.date, list);
    }

    for (const row of departuresResult.rows) {
      const list = departuresByDate.get(row.date) ?? [];
      list.push({
        id: row.id,
        guestName: row.guest_name ?? null,
        guestEmail: row.guest_email ?? null,
        roomIds: row.room_ids ?? [],
        status: row.status,
      });
      departuresByDate.set(row.date, list);
    }

    for (const row of inHouseResult.rows) {
      inHouseByDate.set(row.date, row.in_house);
    }

    // Build result for each day
    const result: DayForecast[] = [];
    for (let i = 0; i < safeDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const arrivals = arrivalsByDate.get(dateStr) ?? [];
      const departures = departuresByDate.get(dateStr) ?? [];
      result.push({
        date: dateStr,
        checkIns: arrivals.length,
        checkOuts: departures.length,
        inHouseGuests: inHouseByDate.get(dateStr) ?? 0,
        arrivals,
        departures,
      });
    }

    return result;
  }
}

export const forecastRepository = new ForecastRepository();
