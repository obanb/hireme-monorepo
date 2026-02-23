import { v4 as uuidv4 } from "uuid";
import { roomTypeRepository } from "../event-sourcing";
import { formatRoomType } from "../formatters/room.formatter";
import { formatStoredEvent } from "../formatters/event.formatter";

export const roomTypeResolvers = {
  Query: {
    roomType: async (_: unknown, args: { id: string }) => {
      const roomType = await roomTypeRepository.getReadModel(args.id);
      if (!roomType) return null;
      return formatRoomType(roomType);
    },

    roomTypes: async (_: unknown, args: { includeInactive?: boolean }) => {
      const roomTypes = await roomTypeRepository.listReadModels(args.includeInactive ?? false);
      return roomTypes.map(formatRoomType);
    },
  },

  Mutation: {
    createRoomType: async (
      _: unknown,
      args: { input: { code: string; name: string } }
    ) => {
      const roomTypeId = uuidv4();
      const { events } = await roomTypeRepository.create(roomTypeId, {
        code: args.input.code,
        name: args.input.name,
      });

      const roomType = await roomTypeRepository.getReadModel(roomTypeId);

      return {
        roomType: roomType ? formatRoomType(roomType) : {
          id: roomTypeId,
          code: args.input.code,
          name: args.input.name,
          isActive: true,
          version: 1,
        },
        events: events.map(formatStoredEvent),
      };
    },

    updateRoomType: async (
      _: unknown,
      args: {
        id: string;
        input: { code?: string; name?: string; isActive?: boolean };
      }
    ) => {
      const { events } = await roomTypeRepository.update(args.id, args.input);
      const roomType = await roomTypeRepository.getReadModel(args.id);
      return {
        roomType: roomType ? formatRoomType(roomType) : null,
        events: events.map(formatStoredEvent),
      };
    },

    deleteRoomType: async (_: unknown, args: { id: string }) => {
      const { events } = await roomTypeRepository.delete(args.id);
      return { success: true, events: events.map(formatStoredEvent) };
    },
  },
};
