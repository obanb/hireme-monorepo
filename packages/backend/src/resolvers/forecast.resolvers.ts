import { forecastRepository } from '../event-sourcing/forecast-repository';

export const forecastResolvers = {
  Query: {
    receptionForecast: async (_: unknown, args: { days?: number }) => {
      return forecastRepository.getReceptionForecast(args.days ?? 3);
    },
  },
};
