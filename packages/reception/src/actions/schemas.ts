import { z } from "zod";

// ── Action Type ────────────────────────────────────────────────────────────────

export const ActionTypeSchema = z.object({
  id:        z.string(),
  name:      z.string(),
  color:     z.string(),
  createdAt: z.string(),
});
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const CreateActionTypeInputSchema = z.object({
  name:  z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color"),
});
export type CreateActionTypeInput = z.infer<typeof CreateActionTypeInputSchema>;

export const UpdateActionTypeInputSchema = z.object({
  name:  z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});
export type UpdateActionTypeInput = z.infer<typeof UpdateActionTypeInputSchema>;

// ── Action ─────────────────────────────────────────────────────────────────────

export const HotelActionSchema = z.object({
  id:          z.string(),
  title:       z.string(),
  description: z.string().nullable(),
  typeId:      z.string(),
  startDate:   z.string(),   // YYYY-MM-DD
  endDate:     z.string(),   // YYYY-MM-DD
  pictureUrl:  z.string().nullable(),
  pdfUrl:      z.string().nullable(),
  createdAt:   z.string(),
  updatedAt:   z.string(),
});
export type HotelAction = z.infer<typeof HotelActionSchema>;

export const CreateActionInputSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional().nullable(),
  typeId:      z.string(),
  startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type CreateActionInput = z.infer<typeof CreateActionInputSchema>;

export const UpdateActionInputSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  typeId:      z.string().optional(),
  startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type UpdateActionInput = z.infer<typeof UpdateActionInputSchema>;

// ── Filter / Page ─────────────────────────────────────────────────────────────

export const ActionsFilterSchema = z.object({
  typeId:    z.string().optional().nullable(),
  month:     z.string().optional().nullable(),   // YYYY-MM
  search:    z.string().optional().nullable(),
});
export type ActionsFilter = z.infer<typeof ActionsFilterSchema>;

export interface HotelActionsPage {
  items:      HotelAction[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}
