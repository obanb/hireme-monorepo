import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ── Enums ─────────────────────────────────────────────────────────────────────

export const CheckInStatusSchema = z.enum(["pending", "checked_in", "checked_out", "no_show"]);
export type CheckInStatus = z.infer<typeof CheckInStatusSchema>;

// ── Core schemas ──────────────────────────────────────────────────────────────

export const CheckInSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    reservationId: z.string().uuid(),
    guestName: z.string().min(1),
    roomNumber: z.string().min(1).openapi({ example: "101" }),
    status: CheckInStatusSchema,
    checkInAt: z.string().datetime().nullable(),
    checkOutAt: z.string().datetime().nullable(),
    notes: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("CheckIn");

export type CheckIn = z.infer<typeof CheckInSchema>;

// ── Input schemas ─────────────────────────────────────────────────────────────

export const CreateCheckInInputSchema = z
  .object({
    reservationId: z.string().uuid(),
    guestName: z.string().min(1),
    roomNumber: z.string().min(1),
    notes: z.string().optional(),
  })
  .openapi("CreateCheckInInput");

export type CreateCheckInInput = z.infer<typeof CreateCheckInInputSchema>;

export const CheckOutInputSchema = z
  .object({
    id: z.string().uuid(),
    notes: z.string().optional(),
  })
  .openapi("CheckOutInput");

export type CheckOutInput = z.infer<typeof CheckOutInputSchema>;

export const ListCheckInsFilterSchema = z
  .object({
    status: CheckInStatusSchema.optional(),
    roomNumber: z.string().optional(),
    date: z.string().date().optional(),
  })
  .openapi("ListCheckInsFilter");

export type ListCheckInsFilter = z.infer<typeof ListCheckInsFilterSchema>;
