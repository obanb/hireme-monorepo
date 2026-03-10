import { checkReservationRepo } from "./repo";
import { getReservationCheckDetail } from "./service";

export const checkReservationResolvers = {
  Query: {
    checkReservations: (
      _: unknown,
      { page = 1, limit = 10 }: { page?: number; limit?: number }
    ) => checkReservationRepo.findAll(page, limit),

    checkReservation: (_: unknown, { originId }: { originId: string }) =>
      checkReservationRepo.findByOriginId(originId),

    checkReservationDetail: (_: unknown, { originId }: { originId: string }) =>
      getReservationCheckDetail(originId),
  },
};
