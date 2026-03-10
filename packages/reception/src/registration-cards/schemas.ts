import { z } from "zod";

// ── Hotel ──────────────────────────────────────────────────────────────────────

export const RegistrationCardHotelSchema = z.object({
  id:        z.number().int(),
  name:      z.string(),
  nameShort: z.string(),
  street:    z.string().optional().nullable(),
  city:      z.string().optional().nullable(),
  zip:       z.string().optional().nullable(),
  country:   z.string().optional().nullable(),
});
export type RegistrationCardHotel = z.infer<typeof RegistrationCardHotelSchema>;

// ── Core record ───────────────────────────────────────────────────────────────

export const RegistrationCardSchema = z.object({
  id:                    z.number().int(),
  idCard:                z.number().int(),
  firstname:             z.string(),
  surname:               z.string(),
  dateOfBirth:           z.string().optional().nullable(),   // YYYY-MM-DD
  phone:                 z.string().optional().nullable(),
  email:                 z.string().optional().nullable(),
  street:                z.string().optional().nullable(),
  city:                  z.string().optional().nullable(),
  zip:                   z.string().optional().nullable(),
  countryOfResidence:    z.string().optional().nullable(),
  nationality:           z.string().optional().nullable(),
  documentNumber:        z.string().optional().nullable(),
  visaNumber:            z.string().optional().nullable(),
  carPlate:              z.string().optional().nullable(),
  arrival:               z.string(),   // YYYY-MM-DD
  departure:             z.string(),   // YYYY-MM-DD
  reservationId:         z.number().int(),
  hotel:                 RegistrationCardHotelSchema,
  source:                z.string().optional().nullable(),
  room:                  z.string().optional().nullable(),
  purposeOfStay:         z.string().optional().nullable(),
  idStay:                z.string().optional().nullable(),
  isDataConfirmed:       z.boolean(),
  isGDPRRead:            z.boolean(),
  isHouseRulesAccepted:  z.boolean(),
});
export type RegistrationCard = z.infer<typeof RegistrationCardSchema>;

// ── Filter ────────────────────────────────────────────────────────────────────

export const RegistrationCardsFilterSchema = z.object({
  /** Match by hotel id */
  hotelId:     z.number().int().optional().nullable(),
  /** Match by hotel display name (nameShort) */
  hotelName:   z.string().optional().nullable(),
  /** Arrival date exact match — YYYY-MM-DD */
  arrival:     z.string().optional().nullable(),
  /** Departure date exact match — YYYY-MM-DD */
  departure:   z.string().optional().nullable(),
  /** Guest date of birth — YYYY-MM-DD */
  dateOfBirth: z.string().optional().nullable(),
  /** Full-text: firstname, surname, email, documentNumber, reservationId */
  search:      z.string().optional().nullable(),
});
export type RegistrationCardsFilter = z.infer<typeof RegistrationCardsFilterSchema>;

// ── Paginated response ────────────────────────────────────────────────────────

export interface RegistrationCardsPage {
  items:      RegistrationCard[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ── Procedure params (future MSSQL) ──────────────────────────────────────────

export interface RegistrationCardsProcedureParams {
  dateFrom?: string;   // YYYY-MM-DD
  dateTo?:   string;
}
