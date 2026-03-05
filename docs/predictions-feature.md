# Arrival Intelligence / Predictions Feature

> **Page:** `/hotel-cms/predictions`
> **Purpose:** Show receptionists how many guests are expected to arrive and depart — broken down by hour — for the next 1–3 days, so staff can anticipate busy periods.

---

## The Core Problem

Our reservation records store `check_in_date` and `check_out_date` as **DATE** columns, not timestamps. We never record *what time* a guest actually arrives. This means we cannot derive true hourly distributions from our own data.

**Solution:** We know the *total count* of arrivals and departures per day from the database. We then distribute those counts across 24 hours using a fixed **industry-standard pattern** (see below). The result is a model-based hourly forecast — accurate in shape, approximate in exact timing.

---

## Architecture

```
Frontend (/hotel-cms/predictions)
    │
    │  GraphQL: receptionForecast(days: Int)
    ▼
Backend subgraph (port 4001)
    │
    │  forecast.resolvers.ts
    ▼
ForecastRepository (forecast-repository.ts)
    │
    │  3× PostgreSQL queries
    ▼
reservations table (read model)
```

### Files

| Layer | File | Role |
|---|---|---|
| Schema | `packages/shared-schema/schema/forecast.graphql` | GraphQL types + query |
| Schema index | `packages/shared-schema/src/index.ts` | Registers `getForecastSchema()` in `getCombinedSchema()` |
| Repository | `packages/backend/src/event-sourcing/forecast-repository.ts` | SQL queries |
| Resolver | `packages/backend/src/resolvers/forecast.resolvers.ts` | Wires query to repository |
| Resolver index | `packages/backend/src/resolvers/index.ts` | Imports `forecastResolvers` |
| Frontend page | `packages/frontend/src/app/hotel-cms/predictions/page.tsx` | UI |
| Sidebar | `packages/frontend/src/components/HotelSidebar.tsx` | Nav link |

---

## Backend: What the Database Returns

The repository fires **3 parallel-ish queries** for the requested date window:

### 1. Arrivals per day
```sql
SELECT id, check_in_date::text AS date,
       COALESCE(guest_first_name || ' ' || guest_last_name, guest_email) AS guest_name,
       guest_email, room_ids, status
FROM reservations
WHERE check_in_date >= CURRENT_DATE
  AND check_in_date < CURRENT_DATE + $days * INTERVAL '1 day'
  AND status != 'CANCELLED'
ORDER BY check_in_date
```

### 2. Departures per day
Same shape, but filters on `check_out_date`.

### 3. In-house guest count per day
```sql
SELECT gs.day::text AS date,
       COUNT(DISTINCT r.id)::int AS in_house
FROM generate_series(CURRENT_DATE, CURRENT_DATE + ($days-1) * INTERVAL '1 day', '1 day') AS gs(day)
LEFT JOIN reservations r
  ON r.check_in_date <= gs.day
  AND r.check_out_date > gs.day
  AND r.status != 'CANCELLED'
GROUP BY gs.day
ORDER BY gs.day
```

The repository then combines the three result sets into a `DayForecast[]` array (one entry per day), grouping arrival and departure rows by date.

### GraphQL response shape
```graphql
type ForecastGuest {
  id: ID!
  guestName: String
  guestEmail: String
  roomIds: [ID!]!
  status: String!
}

type DayForecast {
  date: String!          # "2026-03-05"
  checkIns: Int!         # total arrivals that day
  checkOuts: Int!        # total departures that day
  inHouseGuests: Int!    # guests physically in hotel all day
  arrivals: [ForecastGuest!]!
  departures: [ForecastGuest!]!
}
```

---

## Frontend: Hourly Distribution Model

The frontend receives `checkIns` and `checkOuts` as daily totals and spreads them across 24 hours using two fixed weight arrays:

### `ARRIVAL_DIST` (index = hour 0–23)
```
00–06: ~0      (almost no check-ins overnight)
07–10: 0.2–1.0 (early risers, post-red-eye flights)
11–13: 1.2–2.0 (late-morning, pre-check-in-time pressure)
14–17: 4.2–5.0 ← PEAK  (standard 14:00 check-in time)
18–21: 1.5–3.0 (evening arrivals, dinner-time)
22–23: 0.3–0.8 (late arrivals)
```

### `DEPARTURE_DIST` (index = hour 0–23)
```
00–06: ~0      (no one checks out overnight)
07–09: 1.5–3.5 (early flights)
10–12: 4.5–5.0 ← PEAK  (standard 11:00–12:00 checkout)
13–15: 1.5–3.0 (post-lunch departures)
16–22: 0.1–1.0 (trickle departures)
```

### Distribution algorithm

```ts
function distributeToHours(total: number, dist: number[]): number[] {
  const sum = dist.reduce((a, b) => a + b, 0);
  const raw = dist.map(w => (w / sum) * total);
  const floored = raw.map(Math.floor);
  // distribute rounding remainder to hours with highest fractional part
  let remainder = total - floored.reduce((a, b) => a + b, 0);
  const diffs = raw.map((v, i) => ({ i, d: v - floored[i] })).sort((a, b) => b.d - a.d);
  for (let k = 0; k < remainder; k++) floored[diffs[k].i]++;
  return floored; // always sums exactly to `total`
}
```

The result is **integer counts per hour that always sum to the exact daily total** — no floating point drift.

---

## UI

- **1D / 2D / 3D selector** — calls `receptionForecast(days: N)` with different values
- **Summary strip** — current in-house count, total arrivals, total departures across selected window
- **Per-day cards:**
  - Intensity label: Quiet / Moderate / Busy / Peak (based on `checkIns + checkOuts`)
  - Stat row with green arrivals count + amber departures count
  - **Peak time badges** — derives the peak hour from the distribution arrays (e.g. "arrival peak 15:00")
  - **Hourly bar chart** — green bars = arrivals, amber bars = departures, current hour glows, past hours dimmed
  - **Guest roster tabs** — arrivals / departures list, each row links to the booking detail page
- **Live clock** in the header (updates every second via `setInterval`)

---

## Limitations & Future Improvements

| Limitation | Future fix |
|---|---|
| Hourly distribution is modelled, not measured | Add a `check_in_time` timestamp column; record actual arrival time on check-in via the wizard |
| No day-of-week adjustment | Weight distributions differently for weekends vs. weekdays |
| No seasonal adjustment | Learn from historical data (e.g. summer beach resort vs. winter ski resort patterns) |
| Distribution is hotel-agnostic | Allow hotel admins to configure their own peak hours in Settings |

---

## Extending the Feature

### To record actual arrival times

1. Add `checked_in_at TIMESTAMPTZ` to the `reservations` table.
2. Set it in the `confirmReservation` mutation (or a new `checkIn` mutation).
3. Update `forecast-repository.ts` to group by `EXTRACT(HOUR FROM checked_in_at)` for historical days and keep the model for future days.

### To add more days

The `days` parameter is capped at 14 in the repository (`Math.min(Math.max(days, 1), 14)`). Increase the cap and add a UI selector option.
