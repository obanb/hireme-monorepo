import { v4 as uuidv4 } from "uuid";
import { voucherRepository } from "../event-sourcing";
import { formatVoucher } from "../formatters/voucher.formatter";
import { formatStoredEvent } from "../formatters/event.formatter";

export const voucherResolvers = {
  Query: {
    voucher: async (_: unknown, args: { id: string }) => {
      const voucher = await voucherRepository.getReadModel(args.id);
      if (!voucher) return null;
      return formatVoucher(voucher);
    },

    vouchers: async (
      _: unknown,
      args: { includeInactive?: boolean; hotel?: number; status?: string }
    ) => {
      const vouchers = await voucherRepository.listReadModels({
        includeInactive: args.includeInactive,
        hotel: args.hotel,
        status: args.status,
      });
      return vouchers.map(formatVoucher);
    },
  },

  Mutation: {
    createVoucher: async (
      _: unknown,
      args: {
        input: {
          code?: string;
          hotel?: number;
          lang?: string;
          price: number;
          purchasePrice?: number;
          currency?: string;
          validity: string;
          paymentType?: string;
          deliveryType?: string;
          deliveryPrice?: number;
          note?: string;
          format?: string;
          gift?: string;
          giftMessage?: string;
          applicableInBookolo?: boolean;
          isPrivateType?: boolean;
          isFreeType?: boolean;
          customerData: {
            name?: string;
            street?: string;
            houseNumber?: string;
            city?: string;
            postalCode?: string;
            country?: string;
            email?: string;
            tel?: string;
            company?: string;
            cin?: string;
            tin?: string;
          };
          giftData?: {
            name?: string;
            street?: string;
            houseNumber?: string;
            city?: string;
            postalCode?: string;
            country?: string;
            email?: string;
            tel?: string;
          };
        };
      }
    ) => {
      const id = uuidv4();
      const { events } = await voucherRepository.create(id, {
        code: args.input.code,
        hotel: args.input.hotel,
        lang: args.input.lang,
        price: args.input.price,
        purchasePrice: args.input.purchasePrice,
        currency: args.input.currency,
        validity: args.input.validity,
        paymentType: args.input.paymentType,
        deliveryType: args.input.deliveryType,
        deliveryPrice: args.input.deliveryPrice,
        note: args.input.note,
        format: args.input.format,
        gift: args.input.gift,
        giftMessage: args.input.giftMessage,
        applicableInBookolo: args.input.applicableInBookolo,
        isPrivateType: args.input.isPrivateType,
        isFreeType: args.input.isFreeType,
        customerData: args.input.customerData,
        giftData: args.input.giftData,
      });
      const voucher = await voucherRepository.getReadModel(id);
      return { voucher: voucher ? formatVoucher(voucher) : null, events: events.map(formatStoredEvent) };
    },

    updateVoucher: async (
      _: unknown,
      args: {
        id: string;
        input: {
          code?: string;
          price?: number;
          purchasePrice?: number;
          currency?: string;
          validity?: string;
          paymentType?: string;
          deliveryType?: string;
          deliveryPrice?: number;
          note?: string;
          format?: string;
          gift?: string;
          giftMessage?: string;
          active?: boolean;
          applicableInBookolo?: boolean;
          isPrivateType?: boolean;
          customerData?: Record<string, unknown>;
          giftData?: Record<string, unknown>;
        };
      }
    ) => {
      const { events } = await voucherRepository.update(args.id, args.input);
      const voucher = await voucherRepository.getReadModel(args.id);
      return { voucher: voucher ? formatVoucher(voucher) : null, events: events.map(formatStoredEvent) };
    },

    cancelVoucher: async (_: unknown, args: { id: string; reason?: string }) => {
      const { events } = await voucherRepository.cancel(args.id, args.reason);
      const voucher = await voucherRepository.getReadModel(args.id);
      return { voucher: voucher ? formatVoucher(voucher) : null, events: events.map(formatStoredEvent) };
    },

    useVoucher: async (
      _: unknown,
      args: {
        id: string;
        input: { amount: number; reservationNumber?: string; usedIn?: string };
      }
    ) => {
      const { events } = await voucherRepository.use(
        args.id,
        args.input.amount,
        args.input.reservationNumber,
        args.input.usedIn
      );
      const voucher = await voucherRepository.getReadModel(args.id);
      return { voucher: voucher ? formatVoucher(voucher) : null, events: events.map(formatStoredEvent) };
    },

    markVoucherPaid: async (_: unknown, args: { id: string }) => {
      const { events } = await voucherRepository.markPaid(args.id);
      const voucher = await voucherRepository.getReadModel(args.id);
      return { voucher: voucher ? formatVoucher(voucher) : null, events: events.map(formatStoredEvent) };
    },

    deleteVoucher: async (_: unknown, args: { id: string }) => {
      const { events } = await voucherRepository.delete(args.id);
      return { success: true, events: events.map(formatStoredEvent) };
    },
  },
};
