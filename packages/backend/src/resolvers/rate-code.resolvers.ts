import { v4 as uuidv4 } from "uuid";
import { rateCodeRepository } from "../event-sourcing";
import { formatRateCode } from "../formatters/room.formatter";
import { formatStoredEvent } from "../formatters/event.formatter";

export const rateCodeResolvers = {
  Query: {
    rateCode: async (_: unknown, args: { id: string }) => {
      const rateCode = await rateCodeRepository.getReadModel(args.id);
      if (!rateCode) return null;
      return formatRateCode(rateCode);
    },

    rateCodes: async (_: unknown, args: { includeInactive?: boolean }) => {
      const rateCodes = await rateCodeRepository.listReadModels(args.includeInactive ?? false);
      return rateCodes.map(formatRateCode);
    },
  },

  Mutation: {
    createRateCode: async (
      _: unknown,
      args: { input: { code: string; name: string; description?: string } }
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

    updateRateCode: async (
      _: unknown,
      args: {
        id: string;
        input: { code?: string; name?: string; description?: string; isActive?: boolean };
      }
    ) => {
      const { events } = await rateCodeRepository.update(args.id, args.input);
      const rateCode = await rateCodeRepository.getReadModel(args.id);
      return {
        rateCode: rateCode ? formatRateCode(rateCode) : null,
        events: events.map(formatStoredEvent),
      };
    },

    deleteRateCode: async (_: unknown, args: { id: string }) => {
      const { events } = await rateCodeRepository.delete(args.id);
      return { success: true, events: events.map(formatStoredEvent) };
    },
  },
};
