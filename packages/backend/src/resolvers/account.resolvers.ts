import { accountRepository, reservationRepository } from "../event-sourcing";
import { formatAccount } from "../formatters/account.formatter";
import { formatReservation } from "../formatters/reservation.formatter";

export const accountResolvers = {
  Query: {
    account: async (_: unknown, args: { id: number }) => {
      const account = await accountRepository.getById(args.id);
      if (!account) return null;
      return formatAccount(account);
    },

    accounts: async (
      _: unknown,
      args: {
        filter?: {
          reservationId?: string;
          minTotal?: number;
          maxTotal?: number;
          createdFrom?: string;
          createdTo?: string;
        };
        limit?: number;
        offset?: number;
      }
    ) => {
      const accounts = await accountRepository.list({
        filter: args.filter,
        limit: args.limit,
        offset: args.offset,
      });
      return accounts.map(formatAccount);
    },
  },

  Account: {
    reservation: async (parent: { reservationId: string }) => {
      const reservation = await reservationRepository.getReadModel(parent.reservationId);
      if (!reservation) return null;
      return formatReservation(reservation);
    },
  },
};
