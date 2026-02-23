import { v4 as uuidv4 } from "uuid";
import { guestRepository, getPool } from "../event-sourcing";
import { requireAuth, AuthContext } from "../auth";
import { formatGuest } from "../formatters/guest.formatter";
import { formatReservation } from "../formatters/reservation.formatter";
import { formatVoucher } from "../formatters/voucher.formatter";
import { formatStoredEvent } from "../formatters/event.formatter";

export const guestResolvers = {
  Query: {
    guest: async (_: unknown, args: { id: string }) => {
      const guest = await guestRepository.getReadModel(args.id);
      if (!guest) return null;
      return formatGuest(guest);
    },

    guestByEmail: async (_: unknown, args: { email: string }) => {
      const guest = await guestRepository.getReadModelByEmail(args.email);
      if (!guest) return null;
      return formatGuest(guest);
    },

    guests: async (
      _: unknown,
      args: {
        filter?: { email?: string; name?: string; nationality?: string; passportNumber?: string };
        limit?: number;
        offset?: number;
      }
    ) => {
      const guests = await guestRepository.listReadModels({
        filter: args.filter,
        limit: args.limit,
        offset: args.offset,
      });
      return guests.map(formatGuest);
    },
  },

  Mutation: {
    createGuest: async (
      _: unknown,
      args: {
        input: {
          email: string;
          firstName?: string;
          lastName?: string;
          phone?: string;
          dateOfBirth?: string;
          birthPlace?: string;
          nationality?: string;
          citizenship?: string;
          passportNumber?: string;
          visaNumber?: string;
          purposeOfStay?: string;
          homeAddress?: { street?: string; city?: string; postalCode?: string; country?: string };
          notes?: string;
        };
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      const id = uuidv4();
      const { events } = await guestRepository.create(id, {
        email: args.input.email,
        firstName: args.input.firstName,
        lastName: args.input.lastName,
        phone: args.input.phone,
        dateOfBirth: args.input.dateOfBirth,
        birthPlace: args.input.birthPlace,
        nationality: args.input.nationality,
        citizenship: args.input.citizenship,
        passportNumber: args.input.passportNumber,
        visaNumber: args.input.visaNumber,
        purposeOfStay: args.input.purposeOfStay,
        homeAddress: args.input.homeAddress,
        notes: args.input.notes,
      });
      const guest = await guestRepository.getReadModel(id);
      return { guest: guest ? formatGuest(guest) : null, events: events.map(formatStoredEvent) };
    },

    updateGuest: async (
      _: unknown,
      args: {
        id: string;
        input: {
          email?: string;
          firstName?: string;
          lastName?: string;
          phone?: string;
          dateOfBirth?: string;
          birthPlace?: string;
          nationality?: string;
          citizenship?: string;
          passportNumber?: string;
          visaNumber?: string;
          purposeOfStay?: string;
          homeAddress?: { street?: string; city?: string; postalCode?: string; country?: string };
          notes?: string;
        };
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      const { events } = await guestRepository.update(args.id, args.input);
      const guest = await guestRepository.getReadModel(args.id);
      return { guest: guest ? formatGuest(guest) : null, events: events.map(formatStoredEvent) };
    },

    deleteGuest: async (_: unknown, args: { id: string }, context: AuthContext) => {
      requireAuth(context);
      const { events } = await guestRepository.delete(args.id);
      return { success: true, events: events.map(formatStoredEvent) };
    },
  },

  Guest: {
    reservations: async (parent: { email: string }) => {
      const pool = getPool();
      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT * FROM reservations WHERE guest_email = $1 ORDER BY created_at DESC`,
          [parent.email]
        );
        return result.rows.map((row: Record<string, unknown>) => formatReservation({
          id: row.id as string,
          originId: row.origin_id as string | null,
          guestName: row.guest_name as string | null,
          guestEmail: row.guest_email as string | null,
          status: row.status as string,
          checkInDate: row.check_in_date as Date | null,
          checkOutDate: row.check_out_date as Date | null,
          totalAmount: row.total_amount ? parseFloat(row.total_amount as string) : null,
          currency: row.currency as string | null,
          roomId: row.room_id as string | null,
          version: row.version as number,
          createdAt: row.created_at as Date,
          updatedAt: row.updated_at as Date,
        }));
      } finally {
        client.release();
      }
    },
    vouchers: async (parent: { email: string }) => {
      const pool = getPool();
      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT * FROM vouchers WHERE customer_data->>'email' = $1 ORDER BY created_at DESC`,
          [parent.email]
        );
        return result.rows.map((row: Record<string, unknown>) => {
          const mapRow = (r: Record<string, unknown>) => ({
            id: r.id as string,
            code: r.code as string | null,
            number: r.number as string,
            hotel: r.hotel as number,
            lang: r.lang as string,
            createdAt: r.created_at ? (r.created_at as Date).toISOString() : null,
            usedAt: r.used_at ? (r.used_at as Date).toISOString() : null,
            canceledAt: r.canceled_at ? (r.canceled_at as Date).toISOString() : null,
            paidAt: r.paid_at ? (r.paid_at as Date).toISOString() : null,
            variableSymbol: r.variable_symbol as number,
            active: r.active as boolean,
            price: parseFloat(r.price as string),
            purchasePrice: parseFloat(r.purchase_price as string),
            currency: r.currency as string,
            validity: r.validity as string,
            paymentType: r.payment_type as string,
            deliveryType: r.delivery_type as string,
            deliveryPrice: parseFloat(r.delivery_price as string),
            note: r.note as string | null,
            format: r.format as string,
            gift: r.gift as string | null,
            giftMessage: r.gift_message as string | null,
            usedIn: r.used_in as string | null,
            reservationNumber: r.reservation_number as string | null,
            valueTotal: parseFloat(r.value_total as string),
            valueRemaining: parseFloat(r.value_remaining as string),
            valueUsed: parseFloat(r.value_used as string),
            applicableInBookolo: r.applicable_in_bookolo as boolean,
            isPrivateType: r.is_private_type as boolean,
            isFreeType: r.is_free_type as boolean,
            customerData: typeof r.customer_data === 'string' ? JSON.parse(r.customer_data) : (r.customer_data || {}),
            giftData: typeof r.gift_data === 'string' ? JSON.parse(r.gift_data) : (r.gift_data || {}),
            version: r.version as number,
            updatedAt: r.updated_at ? (r.updated_at as Date).toISOString() : null,
          });
          return formatVoucher(mapRow(row));
        });
      } finally {
        client.release();
      }
    },
  },
};
