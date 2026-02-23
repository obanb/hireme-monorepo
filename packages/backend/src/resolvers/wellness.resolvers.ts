import { v4 as uuidv4 } from "uuid";
import {
  wellnessTherapistRepository,
  wellnessRoomTypeRepository,
  wellnessServiceRepository,
  wellnessBookingRepository,
  reservationRepository,
} from "../event-sourcing";
import {
  formatWellnessTherapist,
  formatWellnessRoomType,
  formatWellnessService,
  formatWellnessBooking,
} from "../formatters/wellness.formatter";
import { formatStoredEvent } from "../formatters/event.formatter";
import { formatReservation } from "../formatters/reservation.formatter";

export const wellnessResolvers = {
  Query: {
    wellnessTherapist: async (_: unknown, args: { id: string }) => {
      const therapist = await wellnessTherapistRepository.getReadModel(args.id);
      if (!therapist) return null;
      return formatWellnessTherapist(therapist);
    },

    wellnessTherapists: async (_: unknown, args: { includeInactive?: boolean }) => {
      const therapists = await wellnessTherapistRepository.listReadModels(args.includeInactive ?? false);
      return therapists.map(formatWellnessTherapist);
    },

    wellnessRoomType: async (_: unknown, args: { id: string }) => {
      const roomType = await wellnessRoomTypeRepository.getReadModel(args.id);
      if (!roomType) return null;
      return formatWellnessRoomType(roomType);
    },

    wellnessRoomTypes: async (_: unknown, args: { includeInactive?: boolean }) => {
      const roomTypes = await wellnessRoomTypeRepository.listReadModels(args.includeInactive ?? false);
      return roomTypes.map(formatWellnessRoomType);
    },

    wellnessService: async (_: unknown, args: { id: string }) => {
      const service = await wellnessServiceRepository.getReadModel(args.id);
      if (!service) return null;
      return formatWellnessService(service);
    },

    wellnessServices: async (_: unknown, args: { includeInactive?: boolean }) => {
      const services = await wellnessServiceRepository.listReadModels(args.includeInactive ?? false);
      return services.map(formatWellnessService);
    },

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
      const service = await wellnessServiceRepository.getReadModel(args.input.serviceId);
      if (!service) throw new Error('Service not found');

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
