import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";
import { v4 as uuidv4 } from "uuid";
import { getCombinedSchema, Hotel, QueryHotelArgs, QueryFeaturedHotelsArgs } from "shared-schema";
import {
  initializeDatabase,
  reservationRepository,
  roomRepository,
  roomTypeRepository,
  rateCodeRepository,
  wellnessTherapistRepository,
  wellnessRoomTypeRepository,
  wellnessServiceRepository,
  wellnessBookingRepository,
  eventRelayer,
  closePool,
  StoredEvent,
  RoomType,
  RoomStatus,
  seedDefaultRoomTypes,
} from "./event-sourcing";

// Use types from shared-schema
const hotels: Hotel[] = [
  { id: "hotel-1", name: "Aurora Grand", city: "Reykjavík", rating: 4.8, roomCount: 120 },
  { id: "hotel-2", name: "Marina Vista", city: "Lisbon", rating: 4.5, roomCount: 200 },
  { id: "hotel-3", name: "Summit Lodge", city: "Vancouver", rating: 4.2, roomCount: 95 }
];

// Load combined schema from shared-schema package
const typeDefs = gql(getCombinedSchema());

// Helper to format stored events for GraphQL response
function formatStoredEvent(event: StoredEvent) {
  return {
    id: event.id,
    streamId: event.streamId,
    version: event.version,
    type: event.type,
    data: JSON.stringify(event.data),
    metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    occurredAt: event.occurredAt.toISOString(),
  };
}

// Helper to format reservation for GraphQL response
function formatReservation(reservation: {
  id: string;
  originId: string | null;
  guestName: string | null;
  status: string;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  totalAmount: number | null;
  currency: string | null;
  roomId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: reservation.id,
    originId: reservation.originId,
    guestName: reservation.guestName,
    status: reservation.status,
    checkInDate: reservation.checkInDate?.toISOString().split('T')[0] || null,
    checkOutDate: reservation.checkOutDate?.toISOString().split('T')[0] || null,
    totalAmount: reservation.totalAmount,
    currency: reservation.currency,
    roomId: reservation.roomId,
    version: reservation.version,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

// Helper to format room for GraphQL response
function formatRoom(room: {
  id: string;
  name: string;
  roomNumber: string;
  type: RoomType;
  capacity: number;
  status: RoomStatus;
  color: string;
  roomTypeId?: string | null;
  rateCodeId?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: room.id,
    name: room.name,
    roomNumber: room.roomNumber,
    type: room.type,
    capacity: room.capacity,
    status: room.status,
    color: room.color,
    roomTypeId: room.roomTypeId || null,
    rateCodeId: room.rateCodeId || null,
    version: room.version,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

// Helper to format room type for GraphQL response
function formatRoomType(roomType: {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: roomType.id,
    code: roomType.code,
    name: roomType.name,
    isActive: roomType.isActive,
    version: roomType.version,
    createdAt: roomType.createdAt.toISOString(),
    updatedAt: roomType.updatedAt.toISOString(),
  };
}

// Helper to format rate code for GraphQL response
function formatRateCode(rateCode: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: rateCode.id,
    code: rateCode.code,
    name: rateCode.name,
    description: rateCode.description,
    isActive: rateCode.isActive,
    version: rateCode.version,
    createdAt: rateCode.createdAt.toISOString(),
    updatedAt: rateCode.updatedAt.toISOString(),
  };
}

// Helper to format wellness therapist for GraphQL response
function formatWellnessTherapist(therapist: {
  id: string;
  code: string;
  name: string;
  serviceTypesBitMask: number;
  isVirtual: boolean;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: therapist.id,
    code: therapist.code,
    name: therapist.name,
    serviceTypesBitMask: therapist.serviceTypesBitMask,
    isVirtual: therapist.isVirtual,
    isActive: therapist.isActive,
    version: therapist.version,
    createdAt: therapist.createdAt.toISOString(),
    updatedAt: therapist.updatedAt.toISOString(),
  };
}

// Helper to format wellness room type for GraphQL response
function formatWellnessRoomType(roomType: {
  id: string;
  name: string;
  bit: number;
  maskValue: number;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: roomType.id,
    name: roomType.name,
    bit: roomType.bit,
    maskValue: roomType.maskValue,
    isActive: roomType.isActive,
    version: roomType.version,
    createdAt: roomType.createdAt.toISOString(),
    updatedAt: roomType.updatedAt.toISOString(),
  };
}

// Helper to format wellness service for GraphQL response
function formatWellnessService(service: {
  id: string;
  name: string;
  priceNormal: number;
  priceOBE: number | null;
  priceOVE: number | null;
  vatCharge: number;
  serviceTypeBitMask: number;
  duration: number;
  pauseBefore: number;
  pauseAfter: number;
  needsTherapist: boolean;
  needsRoom: boolean;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: service.id,
    name: service.name,
    priceNormal: service.priceNormal,
    priceOBE: service.priceOBE,
    priceOVE: service.priceOVE,
    vatCharge: service.vatCharge,
    serviceTypeBitMask: service.serviceTypeBitMask,
    duration: service.duration,
    pauseBefore: service.pauseBefore,
    pauseAfter: service.pauseAfter,
    needsTherapist: service.needsTherapist,
    needsRoom: service.needsRoom,
    isActive: service.isActive,
    version: service.version,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

// Helper to format wellness booking for GraphQL response
function formatWellnessBooking(booking: {
  id: string;
  reservationId: string | null;
  guestName: string;
  serviceId: string;
  therapistId: string | null;
  roomTypeId: string | null;
  scheduledDate: string;
  scheduledTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  price: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: booking.id,
    reservationId: booking.reservationId,
    guestName: booking.guestName,
    serviceId: booking.serviceId,
    therapistId: booking.therapistId,
    roomTypeId: booking.roomTypeId,
    scheduledDate: booking.scheduledDate,
    scheduledTime: booking.scheduledTime,
    endTime: booking.endTime,
    status: booking.status,
    notes: booking.notes,
    price: booking.price,
    version: booking.version,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

// Use generated resolver types from shared-schema
const resolvers = {
  Query: {
    // Hotel queries
    hotels: () => hotels,
    hotel: (_: unknown, args: QueryHotelArgs) => hotels.find((hotel) => hotel.id === args.id),
    featuredHotels: (_: unknown, args: QueryFeaturedHotelsArgs) => hotels.slice(0, args.limit ?? 2),

    // Reservation queries (Event Sourcing)
    reservation: async (_: unknown, args: { id: string }) => {
      const reservation = await reservationRepository.getReadModel(args.id);
      if (!reservation) return null;
      return formatReservation(reservation);
    },

    reservations: async (
      _: unknown,
      args: {
        filter?: {
          status?: string;
          guestName?: string;
          checkInFrom?: string;
          checkInTo?: string;
          checkOutFrom?: string;
          checkOutTo?: string;
          createdFrom?: string;
          createdTo?: string;
          currency?: string;
        };
        limit?: number;
        offset?: number;
      }
    ) => {
      const reservations = await reservationRepository.listReadModels({
        filter: args.filter,
        limit: args.limit,
        offset: args.offset,
      });
      return reservations.map(formatReservation);
    },

    reservationEventHistory: async (_: unknown, args: { id: string }) => {
      const events = await reservationRepository.getEventHistory(args.id);
      return events.map(formatStoredEvent);
    },

    // Room queries
    room: async (_: unknown, args: { id: string }) => {
      const room = await roomRepository.getReadModel(args.id);
      if (!room) return null;
      return formatRoom(room);
    },

    rooms: async (
      _: unknown,
      args: {
        type?: RoomType;
        status?: RoomStatus;
      }
    ) => {
      const rooms = await roomRepository.listReadModels({
        filter: {
          type: args.type,
          status: args.status,
        },
      });
      return rooms.map(formatRoom);
    },

    // RoomType queries
    roomType: async (_: unknown, args: { id: string }) => {
      const roomType = await roomTypeRepository.getReadModel(args.id);
      if (!roomType) return null;
      return formatRoomType(roomType);
    },

    roomTypes: async (_: unknown, args: { includeInactive?: boolean }) => {
      const roomTypes = await roomTypeRepository.listReadModels(args.includeInactive ?? false);
      return roomTypes.map(formatRoomType);
    },

    // RateCode queries
    rateCode: async (_: unknown, args: { id: string }) => {
      const rateCode = await rateCodeRepository.getReadModel(args.id);
      if (!rateCode) return null;
      return formatRateCode(rateCode);
    },

    rateCodes: async (_: unknown, args: { includeInactive?: boolean }) => {
      const rateCodes = await rateCodeRepository.listReadModels(args.includeInactive ?? false);
      return rateCodes.map(formatRateCode);
    },

    // Wellness Therapist queries
    wellnessTherapist: async (_: unknown, args: { id: string }) => {
      const therapist = await wellnessTherapistRepository.getReadModel(args.id);
      if (!therapist) return null;
      return formatWellnessTherapist(therapist);
    },

    wellnessTherapists: async (_: unknown, args: { includeInactive?: boolean }) => {
      const therapists = await wellnessTherapistRepository.listReadModels(args.includeInactive ?? false);
      return therapists.map(formatWellnessTherapist);
    },

    // Wellness Room Type queries
    wellnessRoomType: async (_: unknown, args: { id: string }) => {
      const roomType = await wellnessRoomTypeRepository.getReadModel(args.id);
      if (!roomType) return null;
      return formatWellnessRoomType(roomType);
    },

    wellnessRoomTypes: async (_: unknown, args: { includeInactive?: boolean }) => {
      const roomTypes = await wellnessRoomTypeRepository.listReadModels(args.includeInactive ?? false);
      return roomTypes.map(formatWellnessRoomType);
    },

    // Wellness Service queries
    wellnessService: async (_: unknown, args: { id: string }) => {
      const service = await wellnessServiceRepository.getReadModel(args.id);
      if (!service) return null;
      return formatWellnessService(service);
    },

    wellnessServices: async (_: unknown, args: { includeInactive?: boolean }) => {
      const services = await wellnessServiceRepository.listReadModels(args.includeInactive ?? false);
      return services.map(formatWellnessService);
    },

    // Wellness Booking queries
    wellnessBooking: async (_: unknown, args: { id: string }) => {
      const booking = await wellnessBookingRepository.getReadModel(args.id);
      if (!booking) return null;
      return formatWellnessBooking(booking);
    },

    wellnessBookings: async (
      _: unknown,
      args: {
        filter?: {
          scheduledDateFrom?: string;
          scheduledDateTo?: string;
          therapistId?: string;
          roomTypeId?: string;
          serviceId?: string;
          status?: string;
          guestName?: string;
        };
      }
    ) => {
      const bookings = await wellnessBookingRepository.listReadModels(args.filter);
      return bookings.map(formatWellnessBooking);
    },
  },

  Mutation: {
    // Create a new reservation
    createReservation: async (
      _: unknown,
      args: {
        input: {
          originId?: string;
          guestFirstName?: string;
          guestLastName?: string;
          checkInDate?: string;
          checkOutDate?: string;
          totalAmount?: number;
          currency?: string;
          roomId?: string;
        };
      }
    ) => {
      const reservationId = uuidv4();
      const { aggregate, events } = await reservationRepository.create(reservationId, {
        originId: args.input.originId,
        totalAmount: args.input.totalAmount,
        currency: args.input.currency,
        arrivalTime: args.input.checkInDate,
        departureTime: args.input.checkOutDate,
        roomId: args.input.roomId,
        customer: {
          firstName: args.input.guestFirstName,
          lastName: args.input.guestLastName,
        },
      });

      const reservation = await reservationRepository.getReadModel(reservationId);

      return {
        reservation: reservation ? formatReservation(reservation) : {
          id: reservationId,
          status: aggregate.state.status,
          version: aggregate.version,
        },
        events: events.map(formatStoredEvent),
      };
    },

    // Confirm an existing reservation
    confirmReservation: async (
      _: unknown,
      args: { input: { reservationId: string; confirmedBy?: string } }
    ) => {
      const { aggregate, events } = await reservationRepository.confirm(
        args.input.reservationId,
        args.input.confirmedBy
      );

      const reservation = await reservationRepository.getReadModel(args.input.reservationId);

      return {
        reservation: reservation ? formatReservation(reservation) : {
          id: args.input.reservationId,
          status: aggregate.state.status,
          version: aggregate.version,
        },
        events: events.map(formatStoredEvent),
      };
    },

    // Cancel an existing reservation
    cancelReservation: async (
      _: unknown,
      args: { input: { reservationId: string; reason: string } }
    ) => {
      const { aggregate, events } = await reservationRepository.cancel(
        args.input.reservationId,
        args.input.reason
      );

      const reservation = await reservationRepository.getReadModel(args.input.reservationId);

      return {
        reservation: reservation ? formatReservation(reservation) : {
          id: args.input.reservationId,
          status: aggregate.state.status,
          version: aggregate.version,
        },
        events: events.map(formatStoredEvent),
      };
    },

    // Assign a room to an existing reservation
    assignRoom: async (
      _: unknown,
      args: { input: { reservationId: string; roomId: string } }
    ) => {
      const { aggregate, events } = await reservationRepository.assignRoom(
        args.input.reservationId,
        args.input.roomId
      );

      const reservation = await reservationRepository.getReadModel(args.input.reservationId);

      return {
        reservation: reservation ? formatReservation(reservation) : {
          id: args.input.reservationId,
          status: aggregate.state.status,
          roomId: args.input.roomId,
          version: aggregate.version,
        },
        events: events.map(formatStoredEvent),
      };
    },

    // Initialize the database schema
    initializeEventSourcingDatabase: async () => {
      try {
        await initializeDatabase();
        return true;
      } catch (error) {
        console.error("Failed to initialize database:", error);
        return false;
      }
    },

    // Start the event relayer
    startEventRelayer: async () => {
      try {
        await eventRelayer.start();
        return true;
      } catch (error) {
        console.error("Failed to start event relayer:", error);
        return false;
      }
    },

    // Stop the event relayer
    stopEventRelayer: async () => {
      try {
        await eventRelayer.stop();
        return true;
      } catch (error) {
        console.error("Failed to stop event relayer:", error);
        return false;
      }
    },

    // Create a new room
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
      }
    ) => {
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

    // Update an existing room
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

    // Change room status
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

    // Create a new room type
    createRoomType: async (
      _: unknown,
      args: {
        input: {
          code: string;
          name: string;
        };
      }
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

    // Update an existing room type
    updateRoomType: async (
      _: unknown,
      args: {
        id: string;
        input: {
          code?: string;
          name?: string;
          isActive?: boolean;
        };
      }
    ) => {
      const { events } = await roomTypeRepository.update(args.id, args.input);

      const roomType = await roomTypeRepository.getReadModel(args.id);

      return {
        roomType: roomType ? formatRoomType(roomType) : null,
        events: events.map(formatStoredEvent),
      };
    },

    // Delete a room type (soft delete)
    deleteRoomType: async (_: unknown, args: { id: string }) => {
      const { events } = await roomTypeRepository.delete(args.id);

      return {
        success: true,
        events: events.map(formatStoredEvent),
      };
    },

    // Create a new rate code
    createRateCode: async (
      _: unknown,
      args: {
        input: {
          code: string;
          name: string;
          description?: string;
        };
      }
    ) => {
      const rateCodeId = uuidv4();
      const { events } = await rateCodeRepository.create(rateCodeId, {
        code: args.input.code,
        name: args.input.name,
        description: args.input.description,
      });

      const rateCode = await rateCodeRepository.getReadModel(rateCodeId);

      return {
        rateCode: rateCode ? formatRateCode(rateCode) : {
          id: rateCodeId,
          code: args.input.code,
          name: args.input.name,
          description: args.input.description || null,
          isActive: true,
          version: 1,
        },
        events: events.map(formatStoredEvent),
      };
    },

    // Update an existing rate code
    updateRateCode: async (
      _: unknown,
      args: {
        id: string;
        input: {
          code?: string;
          name?: string;
          description?: string;
          isActive?: boolean;
        };
      }
    ) => {
      const { events } = await rateCodeRepository.update(args.id, args.input);

      const rateCode = await rateCodeRepository.getReadModel(args.id);

      return {
        rateCode: rateCode ? formatRateCode(rateCode) : null,
        events: events.map(formatStoredEvent),
      };
    },

    // Delete a rate code (soft delete)
    deleteRateCode: async (_: unknown, args: { id: string }) => {
      const { events } = await rateCodeRepository.delete(args.id);

      return {
        success: true,
        events: events.map(formatStoredEvent),
      };
    },

    // Wellness Therapist mutations
    createWellnessTherapist: async (
      _: unknown,
      args: { input: { code: string; name: string; serviceTypesBitMask?: number; isVirtual?: boolean } }
    ) => {
      const id = uuidv4();
      const { events } = await wellnessTherapistRepository.create(id, {
        code: args.input.code,
        name: args.input.name,
        serviceTypesBitMask: args.input.serviceTypesBitMask,
        isVirtual: args.input.isVirtual,
      });
      const therapist = await wellnessTherapistRepository.getReadModel(id);
      return { therapist: therapist ? formatWellnessTherapist(therapist) : null, events: events.map(formatStoredEvent) };
    },

    updateWellnessTherapist: async (
      _: unknown,
      args: { id: string; input: { code?: string; name?: string; serviceTypesBitMask?: number; isVirtual?: boolean; isActive?: boolean } }
    ) => {
      const { events } = await wellnessTherapistRepository.update(args.id, args.input);
      const therapist = await wellnessTherapistRepository.getReadModel(args.id);
      return { therapist: therapist ? formatWellnessTherapist(therapist) : null, events: events.map(formatStoredEvent) };
    },

    deleteWellnessTherapist: async (_: unknown, args: { id: string }) => {
      const { events } = await wellnessTherapistRepository.delete(args.id);
      return { success: true, events: events.map(formatStoredEvent) };
    },

    // Wellness Room Type mutations
    createWellnessRoomType: async (
      _: unknown,
      args: { input: { name: string; bit: number; maskValue: number } }
    ) => {
      const id = uuidv4();
      const { events } = await wellnessRoomTypeRepository.create(id, args.input);
      const roomType = await wellnessRoomTypeRepository.getReadModel(id);
      return { roomType: roomType ? formatWellnessRoomType(roomType) : null, events: events.map(formatStoredEvent) };
    },

    updateWellnessRoomType: async (
      _: unknown,
      args: { id: string; input: { name?: string; bit?: number; maskValue?: number; isActive?: boolean } }
    ) => {
      const { events } = await wellnessRoomTypeRepository.update(args.id, args.input);
      const roomType = await wellnessRoomTypeRepository.getReadModel(args.id);
      return { roomType: roomType ? formatWellnessRoomType(roomType) : null, events: events.map(formatStoredEvent) };
    },

    deleteWellnessRoomType: async (_: unknown, args: { id: string }) => {
      const { events } = await wellnessRoomTypeRepository.delete(args.id);
      return { success: true, events: events.map(formatStoredEvent) };
    },

    // Wellness Service mutations
    createWellnessService: async (
      _: unknown,
      args: {
        input: {
          name: string;
          priceNormal: number;
          priceOBE?: number;
          priceOVE?: number;
          vatCharge: number;
          serviceTypeBitMask?: number;
          duration: number;
          pauseBefore?: number;
          pauseAfter?: number;
          needsTherapist?: boolean;
          needsRoom?: boolean;
        };
      }
    ) => {
      const id = uuidv4();
      const { events } = await wellnessServiceRepository.create(id, args.input);
      const service = await wellnessServiceRepository.getReadModel(id);
      return { service: service ? formatWellnessService(service) : null, events: events.map(formatStoredEvent) };
    },

    updateWellnessService: async (
      _: unknown,
      args: {
        id: string;
        input: {
          name?: string;
          priceNormal?: number;
          priceOBE?: number;
          priceOVE?: number;
          vatCharge?: number;
          serviceTypeBitMask?: number;
          duration?: number;
          pauseBefore?: number;
          pauseAfter?: number;
          needsTherapist?: boolean;
          needsRoom?: boolean;
          isActive?: boolean;
        };
      }
    ) => {
      const { events } = await wellnessServiceRepository.update(args.id, args.input);
      const service = await wellnessServiceRepository.getReadModel(args.id);
      return { service: service ? formatWellnessService(service) : null, events: events.map(formatStoredEvent) };
    },

    deleteWellnessService: async (_: unknown, args: { id: string }) => {
      const { events } = await wellnessServiceRepository.delete(args.id);
      return { success: true, events: events.map(formatStoredEvent) };
    },

    // Wellness Booking mutations
    createWellnessBooking: async (
      _: unknown,
      args: {
        input: {
          reservationId?: string;
          guestName: string;
          serviceId: string;
          therapistId?: string;
          roomTypeId?: string;
          scheduledDate: string;
          scheduledTime: string;
          notes?: string;
          price?: number;
        };
      }
    ) => {
      const id = uuidv4();
      // Get service to calculate end time and price
      const service = await wellnessServiceRepository.getReadModel(args.input.serviceId);
      if (!service) throw new Error('Service not found');

      // Calculate end time
      const [hours, minutes] = args.input.scheduledTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + service.duration + service.pauseAfter;
      const endHours = Math.floor(totalMinutes / 60);
      const endMins = totalMinutes % 60;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      const { events } = await wellnessBookingRepository.create(id, {
        reservationId: args.input.reservationId,
        guestName: args.input.guestName,
        serviceId: args.input.serviceId,
        therapistId: args.input.therapistId,
        roomTypeId: args.input.roomTypeId,
        scheduledDate: args.input.scheduledDate,
        scheduledTime: args.input.scheduledTime,
        endTime,
        notes: args.input.notes,
        price: args.input.price ?? service.priceNormal,
      });
      const booking = await wellnessBookingRepository.getReadModel(id);
      return { booking: booking ? formatWellnessBooking(booking) : null, events: events.map(formatStoredEvent) };
    },

    updateWellnessBooking: async (
      _: unknown,
      args: {
        id: string;
        input: {
          therapistId?: string;
          roomTypeId?: string;
          scheduledDate?: string;
          scheduledTime?: string;
          notes?: string;
          status?: string;
        };
      }
    ) => {
      // If time changed, recalculate end time
      let updates = { ...args.input } as Record<string, unknown>;
      if (args.input.scheduledTime) {
        const booking = await wellnessBookingRepository.getReadModel(args.id);
        if (booking) {
          const service = await wellnessServiceRepository.getReadModel(booking.serviceId);
          if (service) {
            const [hours, minutes] = args.input.scheduledTime.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes + service.duration + service.pauseAfter;
            const endHours = Math.floor(totalMinutes / 60);
            const endMins = totalMinutes % 60;
            updates.endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
          }
        }
      }
      const { events } = await wellnessBookingRepository.update(args.id, updates);
      const booking = await wellnessBookingRepository.getReadModel(args.id);
      return { booking: booking ? formatWellnessBooking(booking) : null, events: events.map(formatStoredEvent) };
    },

    cancelWellnessBooking: async (_: unknown, args: { id: string; reason?: string }) => {
      const { events } = await wellnessBookingRepository.cancel(args.id, args.reason);
      const booking = await wellnessBookingRepository.getReadModel(args.id);
      return { booking: booking ? formatWellnessBooking(booking) : null, events: events.map(formatStoredEvent) };
    },
  },

  Hotel: {
    __resolveReference(reference: { id: string }) {
      return hotels.find((hotel) => hotel.id === reference.id) ?? null;
    }
  },

  Reservation: {
    room: async (parent: { roomId?: string | null }) => {
      if (!parent.roomId) return null;
      const room = await roomRepository.getReadModel(parent.roomId);
      if (!room) return null;
      return formatRoom(room);
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

  WellnessBooking: {
    service: async (parent: { serviceId?: string | null }) => {
      if (!parent.serviceId) return null;
      const service = await wellnessServiceRepository.getReadModel(parent.serviceId);
      if (!service) return null;
      return formatWellnessService(service);
    },
    therapist: async (parent: { therapistId?: string | null }) => {
      if (!parent.therapistId) return null;
      const therapist = await wellnessTherapistRepository.getReadModel(parent.therapistId);
      if (!therapist) return null;
      return formatWellnessTherapist(therapist);
    },
    roomType: async (parent: { roomTypeId?: string | null }) => {
      if (!parent.roomTypeId) return null;
      const roomType = await wellnessRoomTypeRepository.getReadModel(parent.roomTypeId);
      if (!roomType) return null;
      return formatWellnessRoomType(roomType);
    },
    reservation: async (parent: { reservationId?: string | null }) => {
      if (!parent.reservationId) return null;
      const reservation = await reservationRepository.getReadModel(parent.reservationId);
      if (!reservation) return null;
      return formatReservation(reservation);
    },
  },
};

const schema = buildSubgraphSchema({ typeDefs, resolvers });

async function startServer() {
  // Initialize database schema (creates tables if they don't exist)
  console.log('Initializing database schema...');
  await initializeDatabase();
  console.log('Database schema ready');

  // Seed default room types
  await seedDefaultRoomTypes();

  const app = express();
  const server = new ApolloServer({ schema });
  await server.start();

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async () => ({
        requestId: `req_${Date.now()}`
      })
    })
  );

  const port = process.env.PORT ?? 4001;
  app.listen(port, () => {
    console.log(`🚀 Federated hotel subgraph ready at http://localhost:${port}/graphql`);
    console.log(`📦 Event sourcing endpoints available`);
    console.log(`   - Initialize DB: mutation { initializeEventSourcingDatabase }`);
    console.log(`   - Create reservation: mutation { createReservation(input: {...}) { ... } }`);
    console.log(`   - Cancel reservation: mutation { cancelReservation(input: {...}) { ... } }`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down...");
    await eventRelayer.stop();
    await closePool();
    process.exit(0);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend service", error);
  process.exit(1);
});

