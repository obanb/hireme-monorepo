import { pmsService } from "./service";
import type { PmsReservation } from "./schemas";

// ── Mapper: PascalCase PMS data → camelCase GraphQL shape ─────────────────────

function mapGuest(g: PmsReservation["Rooms"][number]["Guests"][number]) {
  return {
    id:              g.ID,
    idGuestAccount:  g.IDGuestAccount,
    firstName:       g.FirstName,
    surname:         g.Surname,
    address: {
      street:      g.Address.Street,
      city:        g.Address.City,
      zip:         g.Address.Zip,
      countryISO2: g.Address.CountryISO2,
    },
    isMale:          g.IsMale,
    birthDate:       g.BirthDate,
    idCard:          g.IDCard,
    visa:            g.Visa,
    nationalityISO2: g.NationalityISO2,
    email:           g.Email,
    gsm:             g.GSM,
    phone:           g.Phone,
    languageISO:     g.LanguageISO,
    gdpr: {
      repetitiveStay: g.GDPR.RepetitiveStay,
      marketing:      g.GDPR.Marketing,
    },
    idSignature:     g.IDSignature,
    carLicensePlate: g.CarLicensePlate,
  };
}

function mapRoom(r: PmsReservation["Rooms"][number]) {
  return {
    id:              r.ID,
    idStay:          r.IDStay,
    arrival:         r.Arrival,
    departure:       r.Departure,
    eta:             r.ETA,
    state:           r.State,
    roomTypeCode:    r.RoomTypeCode,
    roomCode:        r.RoomCode,
    roomRequestMask: r.RoomRequestMask,
    authCode:        r.AuthCode,
    pax:             r.Pax,
    ages:            r.Ages.map(a => ({ idAge: a.IDAge, amount: a.Amount })),
    guests:          r.Guests.map(mapGuest),
    note:            r.Note,
  };
}

function mapReservation(r: PmsReservation) {
  return {
    id:                       r.ID,
    originID:                 r.OriginID,
    owner: {
      id:          r.Owner.ID,
      name:        r.Owner.Name,
      email:       r.Owner.Email,
      gsm:         r.Owner.GSM,
      phone:       r.Owner.Phone,
      languageISO: r.Owner.LanguageISO,
      idSignature: r.Owner.IDSignature,
    },
    currencyISO:              r.CurrencyISO,
    idMainAccount:            r.IDMainAccount,
    totalPrice:               r.TotalPrice,
    advances:                 r.Advances,
    dueBalance:               r.DueBalance,
    created:                  r.Created,
    arrival:                  r.Arrival,
    departure:                r.Departure,
    segment:                  r.Segment,
    clientType:               r.ClientType,
    source:                   r.Source,
    virtualCardExists:        r.VirtualCardExists,
    chmExtraServiceInclusive: r.CHMExtraServiceInclusive,
    chmExtraServiceExclusive: r.CHMExtraServiceExclusive,
    expectedPaymentMethod:    r.ExpectedPaymentMethod,
    specialsMask:             r.SpecialsMask,
    rooms:                    r.Rooms.map(mapRoom),
    note:                     r.Note,
    passwordProtected:        r.PasswordProtected,
    hasAgreement:             r.HasAgreement,
  };
}

// ── Resolvers ─────────────────────────────────────────────────────────────────

export const pmsResolvers = {
  Query: {
    pmsReservation: async (
      _: unknown,
      { reservationId }: { reservationId: number },
    ) => {
      const data = await pmsService.getDetail(reservationId);
      return data ? mapReservation(data) : null;
    },
  },

  Mutation: {
    pmsUpdateNote: async (
      _: unknown,
      { reservationId, note }: { reservationId: number; note: string },
    ) => {
      const ok = await pmsService.updateNote(reservationId, note);
      return { isSuccess: ok, errors: ok ? null : "Update failed" };
    },

    pmsCheckIn: async (
      _: unknown,
      { input }: { input: { reservationId: number; resRoomId: number } },
    ) => {
      return pmsService.checkIn(input.reservationId, input.resRoomId);
    },

    pmsUpdateGuest: async (
      _: unknown,
      { input }: {
        input: {
          reservationId: number;
          resRoomId:     number;
          stayReasonId?: number | null;
          citizenId:     number;
          citizen: {
            firstName: string; surname: string;
            address: { street: string; city: string; zip: string; countryISO2: string };
            isMale: boolean; birthDate?: string | null;
            idCard: string; visa: string; nationalityISO2?: string | null;
            email?: string | null; gsm?: string | null;
            gdpr: { repetitiveStay: boolean; marketing: boolean };
            loyalty?: { loyaltyConsent: boolean } | null;
            idSignature?: string | null; carLicensePlate?: string | null;
          };
        };
      },
    ) => {
      return pmsService.updateGuest({
        IDReservation: input.reservationId,
        IDResRoom:     input.resRoomId,
        IDStayReason:  input.stayReasonId ?? null,
        IDCitizen:     input.citizenId,
        Citizen: {
          FirstName:       input.citizen.firstName,
          Surname:         input.citizen.surname,
          Address: {
            Street:      input.citizen.address.street,
            City:        input.citizen.address.city,
            Zip:         input.citizen.address.zip,
            CountryISO2: input.citizen.address.countryISO2,
          },
          IsMale:          input.citizen.isMale,
          BirthDate:       input.citizen.birthDate ?? null,
          IDCard:          input.citizen.idCard,
          Visa:            input.citizen.visa,
          NationalityISO2: input.citizen.nationalityISO2 ?? null,
          Email:           input.citizen.email ?? null,
          GSM:             input.citizen.gsm ?? null,
          GDPR: {
            RepetitiveStay: input.citizen.gdpr.repetitiveStay,
            Marketing:      input.citizen.gdpr.marketing,
          },
          Loyalty:         input.citizen.loyalty ? { LoyaltyConsent: input.citizen.loyalty.loyaltyConsent } : undefined,
          IDSignature:     input.citizen.idSignature ?? null,
          CarLicensePlate: input.citizen.carLicensePlate ?? null,
        },
      });
    },

    pmsUpdateOwner: async (
      _: unknown,
      { input }: {
        input: {
          reservationId: number;
          subject: {
            id?:      number | null;
            citizen?: unknown | null;
            company?: {
              name:       string;
              businessId?: number | null;
              vatId?:      string | null;
              vatId2?:     string | null;
              vatPayer?:   boolean;
              address?: {
                street?:      string | null;
                city?:        string | null;
                zip?:         string | null;
                countryISO2?: string | null;
              } | null;
              loyalty?: {
                loyaltyConsent: boolean;
                id?:            number | null;
                number?:        string | null;
              } | null;
              email?: string | null;
              gsm?:   string | null;
              phone?: string | null;
            } | null;
          };
        };
      },
    ) => {
      const { subject } = input;
      return pmsService.updateOwner({
        IDReservation: input.reservationId,
        Subject: {
          ID:      subject.id ?? null,
          Citizen: subject.citizen ?? null,
          Company: subject.company
            ? {
                Name:       subject.company.name,
                BusinessID: subject.company.businessId ?? null,
                VatID:      subject.company.vatId ?? null,
                VatID2:     subject.company.vatId2 ?? null,
                VatPayer:   subject.company.vatPayer,
                Address:    subject.company.address
                  ? {
                      Street:      subject.company.address.street ?? null,
                      City:        subject.company.address.city ?? null,
                      Zip:         subject.company.address.zip ?? null,
                      CountryISO2: subject.company.address.countryISO2 ?? null,
                    }
                  : undefined,
                Loyalty:    subject.company.loyalty
                  ? {
                      LoyaltyConsent: subject.company.loyalty.loyaltyConsent,
                      ID:             subject.company.loyalty.id ?? null,
                      Number:         subject.company.loyalty.number ?? null,
                    }
                  : null,
                Email:      subject.company.email ?? null,
                GSM:        subject.company.gsm ?? null,
                Phone:      subject.company.phone ?? null,
              }
            : null,
        },
      });
    },
  },
};
