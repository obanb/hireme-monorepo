import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ── Status ────────────────────────────────────────────────────────────────────

export const CheckReservationStatusSchema = z.enum(["GREEN", "YELLOW", "RED", "PENDING", "NONE"]);
export type CheckReservationStatus = z.infer<typeof CheckReservationStatusSchema>;

// ── Booking (the shape exposed via GraphQL / returned to callers) ──────────────

export const CheckReservationBookingSchema = z.object({
  originId: z.string(),
  hotelTimeId: z.number().optional().nullable(),
  provider: z.string(),
  date: z.string(),
  adultCount: z.number().int(),
  childCount: z.number().int(),
  checkin: z.string(),
  checkout: z.string(),
  owner: z.string(),
  customerNote: z.string().optional().nullable(),
  notesStatus: CheckReservationStatusSchema,
  featuresStatus: CheckReservationStatusSchema,
  vouchersStatus: CheckReservationStatusSchema,
  paymentsStatus: CheckReservationStatusSchema,
  customerNoteStatus: CheckReservationStatusSchema,
  inventoriesStatus: CheckReservationStatusSchema,
  hskStatus: CheckReservationStatusSchema,
  status: CheckReservationStatusSchema,
}).openapi("CheckReservationBooking");

export type CheckReservationBooking = z.infer<typeof CheckReservationBookingSchema>;

// ── Raw MongoDB document shape (matches `reservationChecks` collection) ────────
// { _id, data: { hotelId, booking: { ... } }, msgNumber, error, errors, created, requestId }

export const CheckReservationDocDataSchema = z.object({
  hotelId: z.number(),
  booking: CheckReservationBookingSchema,
});

export const CheckReservationDocSchema = z.object({
  msgNumber: z.number().optional(),
  error: z.boolean().optional(),
  errors: z.array(z.unknown()).optional(),
  created: z.string().optional(),
  requestId: z.string().optional(),
  data: CheckReservationDocDataSchema,
});

export type CheckReservationDoc = z.infer<typeof CheckReservationDocSchema>;
