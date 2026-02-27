import { tierRepository, formatTier } from '../tiers/tier.repository';
import { requireAuth, AuthContext } from '../auth';

export const tierResolvers = {
  Query: {
    tiers: async () => {
      const rows = await tierRepository.findAll();
      return rows.map(formatTier);
    },

    tier: async (_: unknown, args: { id: string }) => {
      const row = await tierRepository.findById(args.id);
      return row ? formatTier(row) : null;
    },

    guestTierInfo: async (_: unknown, args: { email: string }) => {
      return tierRepository.computeGuestTier(args.email);
    },
  },

  Mutation: {
    createTier: async (
      _: unknown,
      args: {
        input: {
          code: string;
          name: string;
          description?: string | null;
          minReservations?: number | null;
          minSpend?: number | null;
          color: string;
          sortOrder?: number | null;
        };
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      const row = await tierRepository.create(args.input);
      return formatTier(row);
    },

    updateTier: async (
      _: unknown,
      args: {
        id: string;
        input: Partial<{
          code: string;
          name: string;
          description: string | null;
          minReservations: number | null;
          minSpend: number | null;
          color: string;
          sortOrder: number;
        }>;
      },
      context: AuthContext
    ) => {
      requireAuth(context);
      const row = await tierRepository.update(args.id, args.input);
      if (!row) throw new Error('Tier not found');
      return formatTier(row);
    },

    deleteTier: async (_: unknown, args: { id: string }, context: AuthContext) => {
      requireAuth(context);
      return tierRepository.delete(args.id);
    },
  },
};
