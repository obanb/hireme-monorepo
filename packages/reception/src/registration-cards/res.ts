import { registrationCardsService } from "./service";
import type { RegistrationCardsFilter } from "./schemas";

export const registrationCardsResolvers = {
  Query: {
    registrationCards: (
      _: unknown,
      {
        filter = {},
        page   = 1,
        limit  = 20,
      }: {
        filter?: Partial<RegistrationCardsFilter>;
        page?:   number;
        limit?:  number;
      },
    ) =>
      registrationCardsService.list(
        {
          hotelId:     filter.hotelId     ?? null,
          hotelName:   filter.hotelName   ?? null,
          arrival:     filter.arrival     ?? null,
          departure:   filter.departure   ?? null,
          dateOfBirth: filter.dateOfBirth ?? null,
          search:      filter.search      ?? null,
        },
        page,
        limit,
      ),

    registrationCard: (
      _: unknown,
      { id }: { id: number },
    ) => registrationCardsService.findById(id),
  },
};
