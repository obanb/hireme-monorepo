import { arrivingGuestsService } from "./service";
import type { ArrivingGuestsFilter } from "./schemas";

export const arrivingGuestsResolvers = {
  Query: {
    arrivingGuests: (
      _: unknown,
      {
        filter = {},
        page   = 1,
        limit  = 20,
      }: {
        filter?: Partial<ArrivingGuestsFilter>;
        page?:   number;
        limit?:  number;
      },
    ) =>
      arrivingGuestsService.list(
        {
          period:    filter.period    ?? "today",
          hotelName: filter.hotelName ?? null,
          checkedIn: filter.checkedIn ?? null,
        },
        page,
        limit,
      ),
  },
};
