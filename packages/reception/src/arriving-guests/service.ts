import { arrivingGuestsRepo } from "./repo";
import { MOCK_ARRIVING_GUESTS } from "./mock";
import type {
  ArrivingGuest,
  ArrivingGuestsFilter,
  ArrivingGuestsPage,
  ArrivingGuestsProcedureParams,
} from "./schemas";

// Toggle to false once MSSQL is wired up
const USE_MOCK = true;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function periodToDates(period: ArrivingGuestsFilter["period"]): ArrivingGuestsProcedureParams {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      return { dateFrom: isoDate(today), dateTo: isoDate(today) };
    case "tomorrow":
      return { dateFrom: isoDate(addDays(today, 1)), dateTo: isoDate(addDays(today, 1)) };
    case "7days":
    case "days7":
      return { dateFrom: isoDate(today), dateTo: isoDate(addDays(today, 6)) };
  }
}

function applyFilters(items: ArrivingGuest[], filter: ArrivingGuestsFilter): ArrivingGuest[] {
  const { dateFrom, dateTo } = periodToDates(filter.period);

  return items.filter(item => {
    // Period
    if (item.arrival < dateFrom || item.arrival > dateTo) return false;
    // Hotel name
    if (filter.hotelName && item.hotelName !== filter.hotelName) return false;
    // Checked-in
    if (filter.checkedIn === true  && item.roomState !== "CheckedIn")  return false;
    if (filter.checkedIn === false && item.roomState === "CheckedIn")  return false;
    return true;
  });
}

export const arrivingGuestsService = {
  async list(
    filter: ArrivingGuestsFilter,
    page = 1,
    limit = 20,
  ): Promise<ArrivingGuestsPage> {
    let raw: ArrivingGuest[];

    if (USE_MOCK) {
      raw = MOCK_ARRIVING_GUESTS;
    } else {
      const params = periodToDates(filter.period);
      raw = await arrivingGuestsRepo.findByDateRange(params);
    }

    const filtered = applyFilters(raw, filter);

    const totalGuests = filtered.reduce(
      (sum, r) => sum + r.paxCountAdults + r.paxCountChildren,
      0,
    );

    const total      = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip       = (page - 1) * limit;
    const items      = filtered.slice(skip, skip + limit);

    return {
      items,
      total,
      totalRooms:  total,   // 1 booking = 1 room
      totalGuests,
      page,
      limit,
      totalPages,
    };
  },
};
