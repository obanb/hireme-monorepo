import { parkingRepository } from '../parking/parking.repository';
import { requireAuth, AuthContext } from '../auth';

export const parkingResolvers = {
  Query: {
    parkingSpaces: async () => {
      return parkingRepository.getSpacesWithOccupancy();
    },
    parkingSpace: async (_: unknown, args: { id: string }) => {
      return parkingRepository.getSpaceById(args.id);
    },
    parkingStats: async () => {
      return parkingRepository.getStats();
    },
    parkingOccupancies: async (_: unknown, args: { activeOnly?: boolean }) => {
      return parkingRepository.getOccupancies(args.activeOnly ?? false);
    },
  },

  Mutation: {
    assignParking: async (
      _: unknown,
      args: {
        input: {
          spaceId: string;
          ownerName: string;
          ownerEmail?: string | null;
          licensePlate: string;
          from: string;
          to?: string | null;
          notes?: string | null;
        };
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      return parkingRepository.assign(args.input);
    },

    releaseParking: async (
      _: unknown,
      args: { spaceId: string },
      context: AuthContext
    ) => {
      requireAuth(context);
      return parkingRepository.release(args.spaceId);
    },

    updateParkingOccupancy: async (
      _: unknown,
      args: {
        occupancyId: string;
        input: {
          ownerName?: string;
          ownerEmail?: string | null;
          licensePlate?: string;
          from?: string;
          to?: string | null;
          notes?: string | null;
        };
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      const result = await parkingRepository.updateOccupancy(args.occupancyId, args.input);
      if (!result) throw new Error('Occupancy not found');
      return result;
    },
  },
};
