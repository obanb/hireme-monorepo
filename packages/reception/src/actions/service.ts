import { actionsRepo } from "./repo";
import type {
  ActionType, HotelAction, HotelActionsPage,
  CreateActionTypeInput, UpdateActionTypeInput,
  CreateActionInput, UpdateActionInput, ActionsFilter,
} from "./schemas";

export const actionsService = {
  // ── Action types ─────────────────────────────────────────────────────────────
  listActionTypes(): Promise<ActionType[]> {
    return actionsRepo.listActionTypes();
  },

  getActionType(id: string): Promise<ActionType | null> {
    return actionsRepo.getActionType(id);
  },

  createActionType(input: CreateActionTypeInput): Promise<ActionType> {
    return actionsRepo.createActionType(input);
  },

  updateActionType(id: string, input: UpdateActionTypeInput): Promise<ActionType | null> {
    return actionsRepo.updateActionType(id, input);
  },

  deleteActionType(id: string): Promise<boolean> {
    return actionsRepo.deleteActionType(id);
  },

  // ── Actions ──────────────────────────────────────────────────────────────────
  async listActions(
    filter: ActionsFilter,
    page  = 1,
    limit = 50,
  ): Promise<HotelActionsPage> {
    const all = await actionsRepo.listActions({
      typeId: filter.typeId ?? null,
      month:  filter.month  ?? null,
      search: filter.search ?? null,
    });

    const total      = all.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip       = (page - 1) * limit;
    const items      = all.slice(skip, skip + limit);

    return { items, total, page, limit, totalPages };
  },

  getAction(id: string): Promise<HotelAction | null> {
    return actionsRepo.getAction(id);
  },

  createAction(input: CreateActionInput): Promise<HotelAction> {
    return actionsRepo.createAction({
      title:       input.title,
      description: input.description ?? null,
      typeId:      input.typeId,
      startDate:   input.startDate,
      endDate:     input.endDate,
    });
  },

  updateAction(id: string, input: UpdateActionInput): Promise<HotelAction | null> {
    return actionsRepo.updateAction(id, input);
  },

  deleteAction(id: string): Promise<boolean> {
    return actionsRepo.deleteAction(id);
  },
};
