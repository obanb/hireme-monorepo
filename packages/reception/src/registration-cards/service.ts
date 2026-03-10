import { registrationCardsRepo } from "./repo";
import { MOCK_REGISTRATION_CARDS } from "./mock";
import type {
  RegistrationCard,
  RegistrationCardsFilter,
  RegistrationCardsPage,
} from "./schemas";

// Toggle to false once MSSQL is wired up
const USE_MOCK = true;

function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

function applyFilters(items: RegistrationCard[], filter: RegistrationCardsFilter): RegistrationCard[] {
  return items.filter(card => {
    // Hotel id
    if (filter.hotelId != null && card.hotel.id !== filter.hotelId) return false;

    // Hotel name (nameShort, case-insensitive)
    if (filter.hotelName) {
      const q = filter.hotelName.toLowerCase();
      if (!card.hotel.nameShort.toLowerCase().includes(q) && !card.hotel.name.toLowerCase().includes(q)) return false;
    }

    // Arrival date exact
    if (filter.arrival && card.arrival !== filter.arrival) return false;

    // Departure date exact
    if (filter.departure && card.departure !== filter.departure) return false;

    // Date of birth exact
    if (filter.dateOfBirth && card.dateOfBirth !== filter.dateOfBirth) return false;

    // Full-text search
    if (filter.search) {
      const q = normalize(filter.search);
      const haystack = [
        card.firstname,
        card.surname,
        card.email,
        card.documentNumber,
        String(card.reservationId),
        String(card.id),
      ].map(normalize).join(" ");
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

export const registrationCardsService = {
  async list(
    filter: RegistrationCardsFilter,
    page  = 1,
    limit = 20,
  ): Promise<RegistrationCardsPage> {
    let raw: RegistrationCard[];

    if (USE_MOCK) {
      raw = MOCK_REGISTRATION_CARDS;
    } else {
      raw = await registrationCardsRepo.findByDateRange({
        dateFrom: filter.arrival  ?? undefined,
        dateTo:   filter.departure ?? undefined,
      });
    }

    const filtered   = applyFilters(raw, filter);
    const total      = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip       = (page - 1) * limit;
    const items      = filtered.slice(skip, skip + limit);

    return { items, total, page, limit, totalPages };
  },

  async findById(id: number): Promise<RegistrationCard | null> {
    const source = USE_MOCK ? MOCK_REGISTRATION_CARDS : await registrationCardsRepo.findByDateRange({});
    return source.find(c => c.id === id) ?? null;
  },
};
