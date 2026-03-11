import { z } from "zod";

// ── Nested types ──────────────────────────────────────────────────────────────

export const PmsAddressSchema = z.object({
  Street:      z.string(),
  City:        z.string(),
  Zip:         z.string(),
  CountryISO2: z.string(),
});

export const PmsGdprSchema = z.object({
  RepetitiveStay: z.boolean(),
  Marketing:      z.boolean(),
});

export const PmsAgeSchema = z.object({
  IDAge:  z.number().int(),
  Amount: z.number().int(),
});

export const PmsGuestSchema = z.object({
  ID:               z.number().int(),
  IDGuestAccount:   z.number().int(),
  FirstName:        z.string(),
  Surname:          z.string(),
  Address:          PmsAddressSchema,
  IsMale:           z.number().int(),   // 0 | 1
  BirthDate:        z.string().nullable(),
  IDCard:           z.string(),
  Visa:             z.string(),
  NationalityISO2:  z.string().nullable(),
  Email:            z.string().nullable(),
  GSM:              z.string().nullable(),
  Phone:            z.string().nullable(),
  LanguageISO:      z.string(),
  GDPR:             PmsGdprSchema,
  IDSignature:      z.string().nullable(),
  CarLicensePlate:  z.string().nullable(),
});

export const PmsRoomSchema = z.object({
  ID:              z.number().int(),
  IDStay:          z.number().int(),
  Arrival:         z.string(),
  Departure:       z.string(),
  ETA:             z.string().nullable(),
  State:           z.number().int(),
  RoomTypeCode:    z.string(),
  RoomCode:        z.string().nullable(),
  RoomRequestMask: z.number().int(),
  AuthCode:        z.string().nullable(),
  Pax:             z.number().int(),
  Ages:            z.array(PmsAgeSchema),
  Guests:          z.array(PmsGuestSchema),
  Note:            z.string(),
});

export const PmsOwnerSchema = z.object({
  ID:          z.number().int(),
  Name:        z.string(),
  Email:       z.string().nullable(),
  GSM:         z.string().nullable(),
  Phone:       z.string().nullable(),
  LanguageISO: z.string(),
  IDSignature: z.string().nullable(),
});

export const PmsReservationSchema = z.object({
  ID:                       z.number().int(),
  OriginID:                 z.string().nullable(),
  Owner:                    PmsOwnerSchema,
  CurrencyISO:              z.string(),
  IDMainAccount:            z.number().int(),
  TotalPrice:               z.number(),
  Advances:                 z.number(),
  DueBalance:               z.number(),
  Created:                  z.string(),
  Arrival:                  z.string(),
  Departure:                z.string(),
  Segment:                  z.string(),
  ClientType:               z.string(),
  Source:                   z.string(),
  VirtualCardExists:        z.boolean(),
  CHMExtraServiceInclusive: z.boolean(),
  CHMExtraServiceExclusive: z.boolean(),
  ExpectedPaymentMethod:    z.number().int(),
  OTA_PrePaymentData:       z.unknown().nullable(),
  SpecialsMask:             z.number().int(),
  Rooms:                    z.array(PmsRoomSchema),
  Note:                     z.string(),
  PasswordProtected:        z.boolean(),
  HasAgreement:             z.boolean(),
});

export const PmsApiResponseSchema = z.object({
  IsSuccess: z.boolean(),
  Data:      PmsReservationSchema.nullable(),
  Errors:    z.unknown().nullable(),
  Warnings:  z.unknown().nullable(),
});

// ── TypeScript types ──────────────────────────────────────────────────────────

export type PmsAddress     = z.infer<typeof PmsAddressSchema>;
export type PmsGdpr        = z.infer<typeof PmsGdprSchema>;
export type PmsAge         = z.infer<typeof PmsAgeSchema>;
export type PmsGuest       = z.infer<typeof PmsGuestSchema>;
export type PmsRoom        = z.infer<typeof PmsRoomSchema>;
export type PmsOwner       = z.infer<typeof PmsOwnerSchema>;
export type PmsReservation = z.infer<typeof PmsReservationSchema>;
export type PmsApiResponse = z.infer<typeof PmsApiResponseSchema>;

// ── Generic mutation response ─────────────────────────────────────────────────

export interface PmsMutationResponse {
  IsSuccess: boolean;
  Errors:    unknown | null;
  Warnings:  unknown | null;
}

// ── ResNote update ────────────────────────────────────────────────────────────

export interface PmsResNoteUpdateRequest {
  IDReservation: number;
  Note:          string;
}

// ── CheckIn ───────────────────────────────────────────────────────────────────

export interface PmsCheckInRequest {
  IDReservation: number;
  IDResRoom:     number;
}

// ── Guest update ──────────────────────────────────────────────────────────────

export const PmsGuestUpdateAddressSchema = z.object({
  Street:      z.string(),
  City:        z.string(),
  Zip:         z.string(),
  CountryISO2: z.string(),
});

export const PmsGuestUpdateGdprSchema = z.object({
  RepetitiveStay: z.boolean(),
  Marketing:      z.boolean(),
});

export const PmsGuestUpdateLoyaltySchema = z.object({
  LoyaltyConsent: z.boolean(),
}).optional();

export const PmsGuestUpdateCitizenSchema = z.object({
  FirstName:       z.string(),
  Surname:         z.string(),
  Address:         PmsGuestUpdateAddressSchema,
  IsMale:          z.boolean(),
  BirthDate:       z.string().nullable().optional(),
  IDCard:          z.string(),
  Visa:            z.string(),
  NationalityISO2: z.string().nullable().optional(),
  Email:           z.string().nullable().optional(),
  GSM:             z.string().nullable().optional(),
  GDPR:            PmsGuestUpdateGdprSchema,
  Loyalty:         PmsGuestUpdateLoyaltySchema,
  IDSignature:     z.string().nullable().optional(),
  CarLicensePlate: z.string().nullable().optional(),
});

export const PmsGuestUpdateRequestSchema = z.object({
  IDReservation: z.number().int(),
  IDResRoom:     z.number().int(),
  IDStayReason:  z.number().int().nullable().optional(),
  IDCitizen:     z.number().int(),
  Citizen:       PmsGuestUpdateCitizenSchema,
});

export type PmsGuestUpdateRequest = z.infer<typeof PmsGuestUpdateRequestSchema>;
export type PmsGuestUpdateCitizen = z.infer<typeof PmsGuestUpdateCitizenSchema>;

// ── ResOwner update ───────────────────────────────────────────────────────────

export const PmsCompanyAddressSchema = z.object({
  Street:      z.string().nullable().optional(),
  City:        z.string().nullable().optional(),
  Zip:         z.string().nullable().optional(),
  CountryISO2: z.string().nullable().optional(),
});

export const PmsCompanyLoyaltySchema = z.object({
  LoyaltyConsent: z.boolean(),
  ID:             z.number().int().nullable().optional(),
  Number:         z.string().nullable().optional(),
});

export const PmsOwnerCompanySchema = z.object({
  Name:       z.string(),
  BusinessID: z.number().nullable().optional(),
  VatID:      z.string().nullable().optional(),
  VatID2:     z.string().nullable().optional(),
  VatPayer:   z.boolean().optional(),
  Address:    PmsCompanyAddressSchema.optional(),
  Loyalty:    PmsCompanyLoyaltySchema.nullable().optional(),
  Email:      z.string().nullable().optional(),
  GSM:        z.string().nullable().optional(),
  Phone:      z.string().nullable().optional(),
});

export const PmsResOwnerUpdateRequestSchema = z.object({
  IDReservation: z.number().int(),
  Subject: z.object({
    ID:      z.number().int().nullable().optional(),
    Citizen: z.unknown().nullable().optional(),
    Company: PmsOwnerCompanySchema.nullable().optional(),
  }),
});

export type PmsResOwnerUpdateRequest = z.infer<typeof PmsResOwnerUpdateRequestSchema>;
export type PmsOwnerCompany          = z.infer<typeof PmsOwnerCompanySchema>;
