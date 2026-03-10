import { z } from "zod";

// ── Hotel name enum ───────────────────────────────────────────────────────────

export enum HotelName {
  OREA_CONGRESS_HOTEL_BRNO                  = "OREA_CONGRESS_HOTEL_BRNO",
  OREA_HOTEL_ANGELO_PRAHA                   = "OREA_HOTEL_ANGELO_PRAHA",
  OREA_HOTEL_ARIGONE_OLOMOUC               = "OREA_HOTEL_ARIGONE_OLOMOUC",
  OREA_HOTEL_PYRAMIDA_PRAHA                 = "OREA_HOTEL_PYRAMIDA_PRAHA",
  OREA_HOTEL_SPICAK                         = "OREA_HOTEL_SPICAK",
  OREA_HOTEL_VORONEZ_II_BRNO               = "OREA_HOTEL_VORONEZ_II_BRNO",
  OREA_PLACE_MARIENBAD                      = "OREA_PLACE_MARIENBAD",
  OREA_PLACE_SENO                           = "OREA_PLACE_SENO",
  OREA_RESORT_DEVET_SKAL_VYSOCINA          = "OREA_RESORT_DEVET_SKAL_VYSOCINA",
  OREA_RESORT_HORAL_SPINDLERUV_MLYN        = "OREA_RESORT_HORAL_SPINDLERUV_MLYN",
  OREA_RESORT_HORIZONT_SUMAVA              = "OREA_RESORT_HORIZONT_SUMAVA",
  OREA_RESORT_PANORAMA_MORAVSKY_KRAS       = "OREA_RESORT_PANORAMA_MORAVSKY_KRAS",
  OREA_RESORT_SANTON_BRNO                  = "OREA_RESORT_SANTON_BRNO",
  OREA_RESORT_SKLAR_HARRACHOV              = "OREA_RESORT_SKLAR_HARRACHOV",
  OREA_SPA_HOTEL_BOHEMIA_MARIANSKE_LAZNE   = "OREA_SPA_HOTEL_BOHEMIA_MARIANSKE_LAZNE",
  OREA_SPA_HOTEL_CRISTAL_MARIANSKE_LAZNE  = "OREA_SPA_HOTEL_CRISTAL_MARIANSKE_LAZNE",
  OREA_SPA_HOTEL_PALACE_ZVON_MARIANSKE_LAZNE = "OREA_SPA_HOTEL_PALACE_ZVON_MARIANSKE_LAZNE",
  OREA_HOTEL_ANDELS_PRAHA                  = "OREA_HOTEL_ANDELS_PRAHA",
}

// Mapping from HotelTime display name → enum value
export const HOTEL_NAME_TO_ENUM: Record<string, HotelName> = {
  "OREA Congress Hotel Brno":                   HotelName.OREA_CONGRESS_HOTEL_BRNO,
  "OREA Hotel Angelo Praha":                    HotelName.OREA_HOTEL_ANGELO_PRAHA,
  "OREA Hotel Arigone Olomouc":                 HotelName.OREA_HOTEL_ARIGONE_OLOMOUC,
  "Orea Hotel Pyramida Prague":                 HotelName.OREA_HOTEL_PYRAMIDA_PRAHA,
  "OREA Hotel Špicák Šumava":                   HotelName.OREA_HOTEL_SPICAK,
  "OREA Hotel Voro Brno":                       HotelName.OREA_HOTEL_VORONEZ_II_BRNO,
  "OREA Place Marienbad":                       HotelName.OREA_PLACE_MARIENBAD,
  "OREA Place Seno":                            HotelName.OREA_PLACE_SENO,
  "OREA Resort Devet Skal":                     HotelName.OREA_RESORT_DEVET_SKAL_VYSOCINA,
  "OREA Resort Horal Špindleruv Mlýn":          HotelName.OREA_RESORT_HORAL_SPINDLERUV_MLYN,
  "OREA Resort Horizont Šumava":                HotelName.OREA_RESORT_HORIZONT_SUMAVA,
  "OREA Resort Panorama Moravský kras":         HotelName.OREA_RESORT_PANORAMA_MORAVSKY_KRAS,
  "OREA Resort Santon Brno":                    HotelName.OREA_RESORT_SANTON_BRNO,
  "OREA Resort Sklár Harrachov":                HotelName.OREA_RESORT_SKLAR_HARRACHOV,
  "OREA Spa Hotel Bohemia Mariánské Lázne":     HotelName.OREA_SPA_HOTEL_BOHEMIA_MARIANSKE_LAZNE,
  "OREA Spa Hotel Cristal":                     HotelName.OREA_SPA_HOTEL_CRISTAL_MARIANSKE_LAZNE,
  "OREA Spa Hotel Palace Zvon Mariánské Lázne": HotelName.OREA_SPA_HOTEL_PALACE_ZVON_MARIANSKE_LAZNE,
  "OREA Hotel Andel's":                         HotelName.OREA_HOTEL_ANDELS_PRAHA,
};

export const HOTEL_DISPLAY_NAMES = Object.keys(HOTEL_NAME_TO_ENUM);

// ── Period filter ─────────────────────────────────────────────────────────────

export const ArrivalPeriodSchema = z.enum(["today", "tomorrow", "7days", "days7"]);
export type ArrivalPeriod = z.infer<typeof ArrivalPeriodSchema>;

// ── Core data schemas ─────────────────────────────────────────────────────────

export const ArrivingGuestPersonSchema = z.object({
  id:        z.number().int(),
  firstname: z.string(),
  surname:   z.string(),
});
export type ArrivingGuestPerson = z.infer<typeof ArrivingGuestPersonSchema>;

export const ArrivingGuestSchema = z.object({
  id:                 z.number().int(),
  hotelName:          z.string(),
  bookingId:          z.number().int(),
  idStay:             z.string(),
  tier:               z.number().int(),
  tierLabel:          z.string(),
  firstname:          z.string(),
  surname:            z.string(),
  guests:             z.array(ArrivingGuestPersonSchema),
  arrival:            z.string(),          // ISO date YYYY-MM-DD
  departure:          z.string(),          // ISO date YYYY-MM-DD
  paxCountAdults:     z.number().int(),
  paxCountChildren:   z.number().int(),
  paxCountAgeGroup1:  z.number().int(),
  paxCountAgeGroup2:  z.number().int(),
  paxCountAgeGroup3:  z.number().int(),
  paxCountAgeGroup4:  z.number().int(),
  roomType:           z.string(),
  roomRateCode:       z.string(),
  roomResType:        z.string(),
  roomState:          z.string(),
  provider:           z.string(),
  benefits:           z.array(z.unknown()),
  inventoryItems:     z.array(z.unknown()),
  roomCode:           z.string().optional().nullable(),
  deepLink:           z.string(),
});
export type ArrivingGuest = z.infer<typeof ArrivingGuestSchema>;

// ── Filter + pagination input ─────────────────────────────────────────────────

export const ArrivingGuestsFilterSchema = z.object({
  period:    ArrivalPeriodSchema.default("today"),
  hotelName: z.string().optional().nullable(),   // display name from HOTEL_DISPLAY_NAMES
  checkedIn: z.boolean().optional().nullable(),  // filter by roomState === "CheckedIn"
});
export type ArrivingGuestsFilter = z.infer<typeof ArrivingGuestsFilterSchema>;

// ── Paginated response ────────────────────────────────────────────────────────

export interface ArrivingGuestsPage {
  items:       ArrivingGuest[];
  total:       number;   // total matching reservations
  totalRooms:  number;   // same as total (one booking = one room)
  totalGuests: number;   // sum of paxCountAdults + paxCountChildren across items
  page:        number;
  limit:       number;
  totalPages:  number;
}

// ── Procedure params (future MSSQL) ──────────────────────────────────────────

export interface ArrivingGuestsProcedureParams {
  dateFrom: string;   // YYYY-MM-DD
  dateTo:   string;   // YYYY-MM-DD (inclusive)
}
