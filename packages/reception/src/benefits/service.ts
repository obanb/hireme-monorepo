import { benefitsRepo } from "./repo";
import { MOCK_BENEFITS } from "./mock";
import type { BenefitGuest, BenefitsFilter, BenefitsPage, BenefitsProcedureParams } from "./schemas";

const USE_MOCK = true;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function periodToDates(period: BenefitsFilter["period"]): BenefitsProcedureParams {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      return { dateFrom: isoDate(today), dateTo: isoDate(today) };
    case "tomorrow":
      return { dateFrom: isoDate(addDays(today, 1)), dateTo: isoDate(addDays(today, 1)) };
    case "days7":
      return { dateFrom: isoDate(today), dateTo: isoDate(addDays(today, 6)) };
  }
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function applyFilters(items: BenefitGuest[], filter: BenefitsFilter): BenefitGuest[] {
  const { dateFrom, dateTo } = periodToDates(filter.period);

  return items.filter(item => {
    // Period filter by minArrival
    if (item.minArrival < dateFrom || item.minArrival > dateTo) return false;

    // Hotel filter — match against any benefit's hotelName
    if (filter.hotelName) {
      const hasHotel = item.benefits.some(b => b.hotelName === filter.hotelName);
      if (!hasHotel) return false;
    }

    // Search filter — firstname, surname, email, phone, bookingId
    if (filter.search) {
      const q = normalize(filter.search);
      const matches =
        normalize(item.firstname).includes(q) ||
        normalize(item.surname).includes(q) ||
        (item.email  && normalize(item.email).includes(q)) ||
        (item.phone  && normalize(item.phone).includes(q)) ||
        String(item.bookingId).includes(q);
      if (!matches) return false;
    }

    return true;
  });
}

export const benefitsService = {
  async list(
    filter: BenefitsFilter,
    page  = 1,
    limit = 20,
  ): Promise<BenefitsPage> {
    let raw: BenefitGuest[];

    if (USE_MOCK) {
      raw = MOCK_BENEFITS;
    } else {
      const params = periodToDates(filter.period);
      params.hotelName = filter.hotelName ?? undefined;
      raw = await benefitsRepo.findByDateRange(params);
    }

    const filtered   = applyFilters(raw, filter);
    const total      = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip       = (page - 1) * limit;
    const items      = filtered.slice(skip, skip + limit);

    return { items, total, page, limit, totalPages };
  },
};
