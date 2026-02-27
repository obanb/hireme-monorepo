import { requireAuth, AuthContext } from '../auth';
import {
  getRentalItem,
  listRentalItems,
  createRentalItem,
  updateRentalItem,
  deleteRentalItem,
  getRentalBooking,
  listRentalBookings,
  createRentalBooking,
  updateRentalBooking,
  returnRentalBooking,
  getAvailableQuantity,
} from '../rentals/rental.repository';
import { formatRentalItem, formatRentalBooking } from '../formatters/rental.formatter';

export const rentalResolvers = {
  Query: {
    rentalItem: async (_: unknown, args: { id: string }) => {
      const item = await getRentalItem(args.id);
      if (!item) return null;
      const avail = await getAvailableQuantity(item.id);
      return formatRentalItem({ ...item, available_quantity: avail });
    },

    rentalItems: async (
      _: unknown,
      args: { category?: string; isActive?: boolean }
    ) => {
      const items = await listRentalItems({
        category: args.category,
        isActive: args.isActive,
      });
      return Promise.all(
        items.map(async (item) => {
          const avail = await getAvailableQuantity(item.id);
          return formatRentalItem({ ...item, available_quantity: avail });
        })
      );
    },

    rentalBooking: async (_: unknown, args: { id: string }) => {
      const booking = await getRentalBooking(args.id);
      if (!booking) return null;
      return formatRentalBooking(booking);
    },

    rentalBookings: async (
      _: unknown,
      args: { status?: string; itemId?: string }
    ) => {
      const bookings = await listRentalBookings({
        status: args.status,
        itemId: args.itemId,
      });
      return bookings.map(formatRentalBooking);
    },
  },

  Mutation: {
    createRentalItem: async (
      _: unknown,
      args: {
        input: {
          name: string;
          description?: string;
          category: string;
          imageUrl?: string;
          totalQuantity: number;
          dailyRate?: number;
          currency?: string;
        };
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      const item = await createRentalItem(args.input);
      const avail = await getAvailableQuantity(item.id);
      return formatRentalItem({ ...item, available_quantity: avail });
    },

    updateRentalItem: async (
      _: unknown,
      args: {
        id: string;
        input: {
          name?: string;
          description?: string;
          category?: string;
          imageUrl?: string;
          totalQuantity?: number;
          dailyRate?: number;
          currency?: string;
          isActive?: boolean;
        };
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      const item = await updateRentalItem(args.id, args.input);
      if (!item) throw new Error('Rental item not found');
      const avail = await getAvailableQuantity(item.id);
      return formatRentalItem({ ...item, available_quantity: avail });
    },

    deleteRentalItem: async (
      _: unknown,
      args: { id: string },
      context: AuthContext
    ) => {
      requireAuth(context);
      return deleteRentalItem(args.id);
    },

    createRentalBooking: async (
      _: unknown,
      args: {
        input: {
          itemId: string;
          guestName: string;
          guestId?: string;
          quantity: number;
          dueDate?: string;
          notes?: string;
        };
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      const booking = await createRentalBooking(args.input);
      return formatRentalBooking(booking);
    },

    updateRentalBooking: async (
      _: unknown,
      args: { id: string; input: { status?: string; notes?: string } },
      context: AuthContext
    ) => {
      requireAuth(context);
      const booking = await updateRentalBooking(args.id, args.input);
      if (!booking) throw new Error('Rental booking not found');
      return formatRentalBooking(booking);
    },

    returnRentalItem: async (
      _: unknown,
      args: { bookingId: string },
      context: AuthContext
    ) => {
      requireAuth(context);
      const booking = await returnRentalBooking(args.bookingId);
      if (!booking) throw new Error('Rental booking not found');
      return formatRentalBooking(booking);
    },
  },

  RentalBooking: {
    item: async (parent: { itemId: string }) => {
      const item = await getRentalItem(parent.itemId);
      if (!item) return null;
      const avail = await getAvailableQuantity(item.id);
      return formatRentalItem({ ...item, available_quantity: avail });
    },
  },
};
