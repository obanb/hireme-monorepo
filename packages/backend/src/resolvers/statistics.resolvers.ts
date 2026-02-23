import { statisticsRepository } from "../event-sourcing";

export const statisticsResolvers = {
  Query: {
    reservationStats: async (
      _: unknown,
      args: { filter?: { dateFrom?: string; dateTo?: string; currency?: string } }
    ) => {
      return statisticsRepository.getReservationStats(args.filter ?? undefined);
    },

    reservationTimeline: async (
      _: unknown,
      args: { filter: { dateFrom: string; dateTo: string; granularity?: 'DAILY' | 'WEEKLY' | 'MONTHLY' } }
    ) => {
      return statisticsRepository.getReservationTimeline(args.filter);
    },

    roomOccupancyStats: async () => {
      return statisticsRepository.getRoomOccupancyStats();
    },

    revenueTimeline: async (
      _: unknown,
      args: { filter?: { dateFrom?: string; dateTo?: string; currency?: string } }
    ) => {
      return statisticsRepository.getRevenueTimeline(args.filter ?? undefined);
    },
  },
};
