import { actionsService } from "./service";
import { actionsRepo }    from "./repo";
import type {
  ActionsFilter,
  CreateActionTypeInput, UpdateActionTypeInput,
  CreateActionInput,    UpdateActionInput,
} from "./schemas";

// ── Type resolvers ─────────────────────────────────────────────────────────────
// HotelAction.type — resolve ActionType from typeId
const HotelActionResolvers = {
  type: (parent: { typeId: string }) =>
    actionsRepo.getActionType(parent.typeId),
};

// ── Main resolvers ─────────────────────────────────────────────────────────────
export const actionsResolvers = {
  Query: {
    actionTypes: () => actionsService.listActionTypes(),

    actionType: (_: unknown, { id }: { id: string }) =>
      actionsService.getActionType(id),

    actions: (
      _: unknown,
      { filter = {}, page = 1, limit = 50 }: {
        filter?: Partial<ActionsFilter>;
        page?:   number;
        limit?:  number;
      },
    ) =>
      actionsService.listActions(
        { typeId: filter.typeId ?? null, month: filter.month ?? null, search: filter.search ?? null },
        page,
        limit,
      ),

    action: (_: unknown, { id }: { id: string }) =>
      actionsService.getAction(id),
  },

  Mutation: {
    createActionType: (_: unknown, { input }: { input: CreateActionTypeInput }) =>
      actionsService.createActionType(input),

    updateActionType: (_: unknown, { id, input }: { id: string; input: UpdateActionTypeInput }) =>
      actionsService.updateActionType(id, input),

    deleteActionType: (_: unknown, { id }: { id: string }) =>
      actionsService.deleteActionType(id),

    createAction: (_: unknown, { input }: { input: CreateActionInput }) =>
      actionsService.createAction(input),

    updateAction: (_: unknown, { id, input }: { id: string; input: UpdateActionInput }) =>
      actionsService.updateAction(id, input),

    deleteAction: (_: unknown, { id }: { id: string }) =>
      actionsService.deleteAction(id),
  },

  HotelAction: HotelActionResolvers,
};
