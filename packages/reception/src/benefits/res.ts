import { benefitsService } from "./service";
import type { BenefitsFilter } from "./schemas";

export const benefitsResolvers = {
  Query: {
    benefits: (
      _: unknown,
      {
        filter = {},
        page   = 1,
        limit  = 20,
      }: {
        filter?: Partial<BenefitsFilter>;
        page?:   number;
        limit?:  number;
      },
    ) =>
      benefitsService.list(
        {
          period:    filter.period    ?? "today",
          hotelName: filter.hotelName ?? null,
          search:    filter.search    ?? null,
        },
        page,
        limit,
      ),
  },
};
