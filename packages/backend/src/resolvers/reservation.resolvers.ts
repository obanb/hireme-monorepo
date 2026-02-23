import { v4 as uuidv4 } from "uuid";
import {
  reservationRepository,
  roomRepository,
  guestRepository,
  getPool,
} from "../event-sourcing";
import { requireAuth, AuthContext } from "../auth";
import { formatReservation } from "../formatters/reservation.formatter";
import { formatStoredEvent } from "../formatters/event.formatter";
import { formatRoom } from "../formatters/room.formatter";
import { formatGuest } from "../formatters/guest.formatter";

export const reservationResolvers = {
  Query: {
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
  },

  Mutation: {
    createReservation: async (
      _: unknown,
      args: {
        input: {
          originId?: string;
          guestFirstName?: string;
          guestLastName?: string;
          guestEmail?: string;
          checkInDate?: string;
          checkOutDate?: string;
          totalAmount?: number;
          currency?: string;
          roomId?: string;
        };
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      const reservationId = uuidv4();
      const { aggregate, events } = await reservationRepository.create(reservationId, {
        originId: args.input.originId,
        totalAmount: args.input.totalAmount,
        currency: args.input.currency,
        arrivalTime: args.input.checkInDate,
        departureTime: args.input.checkOutDate,
        roomId: args.input.roomId,
        guestEmail: args.input.guestEmail,
        customer: {
          firstName: args.input.guestFirstName,
          lastName: args.input.guestLastName,
        },
      });

      const reservation = await reservationRepository.getReadModel(reservationId);

      // Auto-link guest: if guestEmail provided, find or create guest and link
      if (args.input.guestEmail) {
        try {
          let existingGuest = await guestRepository.getReadModelByEmail(args.input.guestEmail);
          if (!existingGuest) {
            const guestId = uuidv4();
            await guestRepository.create(guestId, {
              email: args.input.guestEmail,
              firstName: args.input.guestFirstName,
              lastName: args.input.guestLastName,
            });
            existingGuest = await guestRepository.getReadModel(guestId);
          }
          if (existingGuest) {
            const pool = getPool();
            const client = await pool.connect();
            try {
              await client.query(
                `UPDATE reservations SET guest_id = $1, guest_email = $2 WHERE id = $3`,
                [existingGuest.id, args.input.guestEmail, reservationId]
              );
            } finally {
              client.release();
            }
          }
        } catch (err) {
          console.error('[guest-auto-link] Failed to auto-link guest:', err);
        }
      }

      return {
        reservation: reservation ? formatReservation(reservation) : {
          id: reservationId,
          status: aggregate.state.status,
          version: aggregate.version,
        },
        events: events.map(formatStoredEvent),
      };
    },

    confirmReservation: async (
      _: unknown,
      args: { input: { reservationId: string; confirmedBy?: string } },
      context: AuthContext
    ) => {
      requireAuth(context);
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

    cancelReservation: async (
      _: unknown,
      args: { input: { reservationId: string; reason: string } },
      context: AuthContext
    ) => {
      requireAuth(context);
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

    assignRoom: async (
      _: unknown,
      args: { input: { reservationId: string; roomId: string } },
      context: AuthContext
    ) => {
      requireAuth(context);
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
  },

  Reservation: {
    room: async (parent: { roomId?: string | null }) => {
      if (!parent.roomId) return null;
      const room = await roomRepository.getReadModel(parent.roomId);
      if (!room) return null;
      return formatRoom(room);
    },
    guest: async (parent: { guestId?: string | null; guestEmail?: string | null }) => {
      if (parent.guestId) {
        const guest = await guestRepository.getReadModel(parent.guestId);
        if (guest) return formatGuest(guest);
      }
      if (parent.guestEmail) {
        const guest = await guestRepository.getReadModelByEmail(parent.guestEmail);
        if (guest) return formatGuest(guest);
      }
      return null;
    },
  },
};
