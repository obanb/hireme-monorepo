import { frontdeskService } from "./service";
import { CreateCheckInInputSchema, CheckOutInputSchema, ListCheckInsFilterSchema } from "./schemas";

export const frontdeskResolvers = {
  Query: {
    checkIn: async (_: unknown, { id }: { id: string }) => {
      return frontdeskService.getCheckIn(id);
    },
    checkIns: async (_: unknown, { filter }: { filter?: unknown }) => {
      const parsed = ListCheckInsFilterSchema.optional().parse(filter);
      return frontdeskService.listCheckIns(parsed ?? {});
    },
  },
  Mutation: {
    createCheckIn: async (_: unknown, { input }: { input: unknown }) => {
      const parsed = CreateCheckInInputSchema.parse(input);
      return frontdeskService.createCheckIn(parsed);
    },
    performCheckIn: async (_: unknown, { id }: { id: string }) => {
      return frontdeskService.performCheckIn(id);
    },
    performCheckOut: async (_: unknown, { input }: { input: unknown }) => {
      const parsed = CheckOutInputSchema.parse(input);
      return frontdeskService.performCheckOut(parsed.id, parsed.notes);
    },
    markNoShow: async (_: unknown, { id }: { id: string }) => {
      return frontdeskService.markNoShow(id);
    },
  },
};
