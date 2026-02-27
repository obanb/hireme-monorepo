import { maintenanceRepository } from '../maintenance/maintenance.repository';
import { requireAuth, AuthContext } from '../auth';

export const maintenanceResolvers = {
  Query: {
    roomMaintenanceRecords: async () => {
      return maintenanceRepository.getAllRooms();
    },
    roomMaintenanceRecord: async (_: unknown, args: { roomId: string }) => {
      return maintenanceRepository.getByRoomId(args.roomId);
    },
  },

  Mutation: {
    updateRoomMaintenance: async (
      _: unknown,
      args: {
        roomId: string;
        input: {
          status: 'DIRTY' | 'CLEAN' | 'MAINTENANCE' | 'CHECKED';
          notes?: string | null;
          updatedBy?: string | null;
        };
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      return maintenanceRepository.upsert(args.roomId, args.input);
    },

    bulkUpdateRoomMaintenance: async (
      _: unknown,
      args: {
        roomIds: string[];
        input: {
          status: 'DIRTY' | 'CLEAN' | 'MAINTENANCE' | 'CHECKED';
          notes?: string | null;
          updatedBy?: string | null;
        };
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      return maintenanceRepository.bulkUpsert(args.roomIds, args.input);
    },
  },
};
