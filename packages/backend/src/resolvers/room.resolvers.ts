import { v4 as uuidv4 } from "uuid";
import {
  roomRepository,
  roomTypeRepository,
  rateCodeRepository,
  RoomType,
  RoomStatus,
} from "../event-sourcing";
import { requireRole, AuthContext } from "../auth";
import { formatRoom, formatRoomType, formatRateCode } from "../formatters/room.formatter";
import { formatStoredEvent } from "../formatters/event.formatter";

export const roomResolvers = {
  Query: {
    room: async (_: unknown, args: { id: string }) => {
      const room = await roomRepository.getReadModel(args.id);
      if (!room) return null;
      return formatRoom(room);
    },

    rooms: async (
      _: unknown,
      args: { type?: RoomType; status?: RoomStatus }
    ) => {
      const rooms = await roomRepository.listReadModels({
        filter: { type: args.type, status: args.status },
      });
      return rooms.map(formatRoom);
    },
  },

  Mutation: {
    createRoom: async (
      _: unknown,
      args: {
        input: {
          name: string;
          roomNumber: string;
          type: RoomType;
          capacity: number;
          color?: string;
          roomTypeId?: string;
          rateCodeId?: string;
        };
      },
      context: AuthContext
    ) => {
      requireRole(context, 'ADMIN', 'USER');
      const roomId = uuidv4();
      const { events } = await roomRepository.create(roomId, {
        name: args.input.name,
        roomNumber: args.input.roomNumber,
        type: args.input.type,
        capacity: args.input.capacity,
        color: args.input.color,
        roomTypeId: args.input.roomTypeId,
        rateCodeId: args.input.rateCodeId,
      });

      const room = await roomRepository.getReadModel(roomId);

      return {
        room: room ? formatRoom(room) : {
          id: roomId,
          name: args.input.name,
          roomNumber: args.input.roomNumber,
          type: args.input.type,
          capacity: args.input.capacity,
          status: 'AVAILABLE',
          color: args.input.color || '#3b82f6',
          roomTypeId: args.input.roomTypeId || null,
          rateCodeId: args.input.rateCodeId || null,
          version: 1,
        },
        events: events.map(formatStoredEvent),
      };
    },

    updateRoom: async (
      _: unknown,
      args: {
        id: string;
        input: {
          name?: string;
          roomNumber?: string;
          type?: RoomType;
          capacity?: number;
          color?: string;
          roomTypeId?: string;
          rateCodeId?: string;
        };
      }
    ) => {
      const { events } = await roomRepository.update(args.id, args.input);
      const room = await roomRepository.getReadModel(args.id);
      return {
        room: room ? formatRoom(room) : null,
        events: events.map(formatStoredEvent),
      };
    },

    changeRoomStatus: async (
      _: unknown,
      args: {
        input: {
          roomId: string;
          status: RoomStatus;
          reason?: string;
        };
      }
    ) => {
      const { events } = await roomRepository.changeStatus(
        args.input.roomId,
        args.input.status,
        args.input.reason
      );
      const room = await roomRepository.getReadModel(args.input.roomId);
      return {
        room: room ? formatRoom(room) : null,
        events: events.map(formatStoredEvent),
      };
    },
  },

  Room: {
    roomTypeEntity: async (parent: { roomTypeId?: string | null }) => {
      if (!parent.roomTypeId) return null;
      const roomType = await roomTypeRepository.getReadModel(parent.roomTypeId);
      if (!roomType) return null;
      return formatRoomType(roomType);
    },
    rateCode: async (parent: { rateCodeId?: string | null }) => {
      if (!parent.rateCodeId) return null;
      const rateCode = await rateCodeRepository.getReadModel(parent.rateCodeId);
      if (!rateCode) return null;
      return formatRateCode(rateCode);
    },
  },
};
