import { z } from "zod";

// ── Individual benefit ─────────────────────────────────────────────────────

export const BenefitItemSchema = z.object({
  id:          z.number().int(),
  benefitRef:  z.number().int(),
  name:        z.string(),
  roomArrival: z.string(),           // YYYY-MM-DD
  hotelName:   z.string(),
  deliveredBy: z.string(),
  created:     z.string(),           // ISO datetime
});
export type BenefitItem = z.infer<typeof BenefitItemSchema>;

// ── Guest with benefits ────────────────────────────────────────────────────

export const BenefitGuestSchema = z.object({
  bookingId:        z.number().int(),
  firstname:        z.string(),
  surname:          z.string(),
  tier:             z.number().int(),
  minArrival:       z.string(),      // YYYY-MM-DD
  phone:            z.string().nullable(),
  email:            z.string().nullable(),
  reservationCount: z.number().int(),
  totalSpent:       z.number(),
  benefits:         z.array(BenefitItemSchema),
  deepLink:         z.string(),
});
export type BenefitGuest = z.infer<typeof BenefitGuestSchema>;

// ── Filter ─────────────────────────────────────────────────────────────────

export const BenefitsPeriodSchema = z.enum(["today", "tomorrow", "days7"]);
export type BenefitsPeriod = z.infer<typeof BenefitsPeriodSchema>;

export const BenefitsFilterSchema = z.object({
  period:    BenefitsPeriodSchema.default("today"),
  hotelName: z.string().optional().nullable(),
  search:    z.string().optional().nullable(),
});
export type BenefitsFilter = z.infer<typeof BenefitsFilterSchema>;

// ── Paginated response ────────────────────────────────────────────────────

export interface BenefitsPage {
  items:        BenefitGuest[];
  total:        number;
  page:         number;
  limit:        number;
  totalPages:   number;
}

// ── Procedure params (future MSSQL) ──────────────────────────────────────

export interface BenefitsProcedureParams {
  dateFrom:  string;   // YYYY-MM-DD
  dateTo:    string;   // YYYY-MM-DD
  hotelName?: string;
}
