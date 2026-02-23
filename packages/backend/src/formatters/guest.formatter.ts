export function formatGuest(guest: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  birthPlace: string | null;
  nationality: string | null;
  citizenship: string | null;
  passportNumber: string | null;
  visaNumber: string | null;
  purposeOfStay: string | null;
  homeStreet: string | null;
  homeCity: string | null;
  homePostalCode: string | null;
  homeCountry: string | null;
  notes: string | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: guest.id,
    email: guest.email,
    firstName: guest.firstName,
    lastName: guest.lastName,
    phone: guest.phone,
    dateOfBirth: guest.dateOfBirth,
    birthPlace: guest.birthPlace,
    nationality: guest.nationality,
    citizenship: guest.citizenship,
    passportNumber: guest.passportNumber,
    visaNumber: guest.visaNumber,
    purposeOfStay: guest.purposeOfStay,
    homeAddress: {
      street: guest.homeStreet,
      city: guest.homeCity,
      postalCode: guest.homePostalCode,
      country: guest.homeCountry,
    },
    notes: guest.notes,
    isActive: guest.isActive,
    version: guest.version,
    createdAt: guest.createdAt.toISOString(),
    updatedAt: guest.updatedAt.toISOString(),
  };
}
