import type { ArrivingGuest } from "./schemas";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const HOTELS = [
  "OREA Hotel Angelo Praha",
  "OREA Hotel Andel's",
  "OREA Hotel Pyramida Prague" ,
  "OREA Congress Hotel Brno",
  "OREA Resort Santon Brno",
  "OREA Spa Hotel Bohemia Mariánské Lázne",
  "OREA Spa Hotel Cristal",
  "OREA Resort Horal Špindleruv Mlýn",
  "OREA Resort Sklár Harrachov",
  "OREA Place Marienbad",
];

const PROVIDERS = ["Booking.com", "Expedia", "Direct", "HotelTime", "Airbnb"];

const BENEFITS = [
  "Free breakfast", "Late checkout", "Room upgrade", "Welcome drink",
  "Free parking", "Spa access", "Early check-in", "Airport transfer",
];

const INVENTORY_ITEMS = [
  "Extra bed", "Baby cot", "Mini bar", "City tax",
  "Dinner package", "Spa package", "Bike rental",
];

const ROOM_TYPES = ["JS", "STD", "DLX", "STE", "FAM", "SUP", "DBL", "TWN"];
const ROOM_STATES = ["Confirmed", "CheckedIn", "Confirmed", "Confirmed", "Confirmed"];
const RATE_CODES = ["BAR-BB-CZ", "FLEX-RO", "PROMO-HB", "PKG-SPA", "CORP-BB", "OTA-RO"];

const TIERS: { tier: number; tierLabel: string }[] = [
  { tier: 1, tierLabel: "Newcomer" },
  { tier: 1, tierLabel: "Newcomer" },
  { tier: 1, tierLabel: "Newcomer" },
  { tier: 2, tierLabel: "Silver"   },
  { tier: 2, tierLabel: "Silver"   },
  { tier: 3, tierLabel: "Gold"     },
  { tier: 4, tierLabel: "Platinum" },
];

const GUESTS_POOL: { firstname: string; surname: string }[] = [
  { firstname: "Axel",     surname: "Goldmann"   },
  { firstname: "Petra",    surname: "Reh"        },
  { firstname: "Jana",     surname: "Kotoučková" },
  { firstname: "Thomas",   surname: "Bauer"      },
  { firstname: "Sophie",   surname: "Müller"     },
  { firstname: "Ondřej",   surname: "Blaha"      },
  { firstname: "Marie",    surname: "Leblanc"    },
  { firstname: "Carlos",   surname: "Ruiz"       },
  { firstname: "Lucia",    surname: "Ferreira"   },
  { firstname: "Hiroshi",  surname: "Tanaka"     },
  { firstname: "Anna",     surname: "Kovář"      },
  { firstname: "Martin",   surname: "Dvořák"     },
  { firstname: "Emma",     surname: "Schmidt"    },
  { firstname: "Lukas",    surname: "Weber"      },
  { firstname: "Camille",  surname: "Dubois"     },
  { firstname: "Jakub",    surname: "Novotný"    },
  { firstname: "Elena",    surname: "Petrova"    },
  { firstname: "Markus",   surname: "Hoffmann"   },
  { firstname: "Tereza",   surname: "Procházková"},
  { firstname: "David",    surname: "Wilson"     },
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function makeDeepLink(hotelSlug: string, bookingId: number): string {
  return `https://${hotelSlug}.hoteltime.cz/provider/ResDet2.aspx?idres=${bookingId}`;
}

let idCounter = 11048000;
let guestIdCounter = 37985000;

function makeReservation(
  seed: number,
  arrivalDate: Date,
): ArrivingGuest {
  const id       = ++idCounter;
  const bookingId = 654300000 + seed * 37;
  const tierInfo  = pick(TIERS, seed + 2);
  const hotel     = pick(HOTELS, seed);
  const provider  = pick(PROVIDERS, seed + 1);
  const roomType  = pick(ROOM_TYPES, seed + 3);
  const roomState = pick(ROOM_STATES, seed + 4);
  const rateCode  = pick(RATE_CODES, seed + 5);

  const primaryGuest = pick(GUESTS_POOL, seed);
  const hasSecond    = seed % 3 !== 0;
  const secondGuest  = hasSecond ? pick(GUESTS_POOL, seed + 7) : null;
  const adults       = hasSecond ? 2 : 1;
  const children     = seed % 5 === 0 ? 1 : 0;

  const guests = [
    { id: ++guestIdCounter, firstname: primaryGuest.firstname, surname: primaryGuest.surname },
    ...(secondGuest ? [{ id: ++guestIdCounter, firstname: secondGuest.firstname, surname: secondGuest.surname }] : []),
  ];

  const nights    = 1 + (seed % 6);
  const departure = addDays(arrivalDate, nights);

  const hotelSlug = hotel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    id,
    hotelName:          hotel,
    bookingId,
    idStay:             String(bookingId - 100000 + seed),
    tier:               tierInfo.tier,
    tierLabel:          tierInfo.tierLabel,
    firstname:          primaryGuest.firstname,
    surname:            primaryGuest.surname,
    guests,
    arrival:            isoDate(arrivalDate),
    departure:          isoDate(departure),
    paxCountAdults:     adults,
    paxCountChildren:   children,
    paxCountAgeGroup1:  0,
    paxCountAgeGroup2:  0,
    paxCountAgeGroup3:  children,
    paxCountAgeGroup4:  adults,
    roomType,
    roomRateCode:       rateCode,
    roomResType:        "Room",
    roomState,
    provider,
    benefits:           seed % 3 === 0 ? [] : Array.from({ length: 1 + (seed % 3) }, (_, i) => pick(BENEFITS, seed + i + 10)),
    inventoryItems:     seed % 4 === 0 ? [] : Array.from({ length: 1 + (seed % 2) }, (_, i) => pick(INVENTORY_ITEMS, seed + i + 15)),
    roomCode:           seed % 4 === 0 ? null : String(100 + (seed * 17 % 800)),
    deepLink:           makeDeepLink(hotelSlug, bookingId),
  };
}

// ── Pinned entries linking to PMS mock data (bookingId = PMS reservation ID) ──

const PINNED_ARRIVALS: ArrivingGuest[] = [
  {
    id: 11040001, hotelName: "OREA Hotel Andel's", bookingId: 654451274,
    idStay: "654451274", tier: 3, tierLabel: "Gold",
    firstname: "Jára", surname: "Malý",
    guests: [{ id: 37980001, firstname: "Jára", surname: "Malý" }],
    arrival: isoDate(today), departure: isoDate(addDays(today, 2)),
    paxCountAdults: 1, paxCountChildren: 0,
    paxCountAgeGroup1: 0, paxCountAgeGroup2: 0, paxCountAgeGroup3: 0, paxCountAgeGroup4: 1,
    roomType: "STDTWN", roomRateCode: "BAR-BB-CZ", roomResType: "Room",
    roomState: "Confirmed", provider: "Direct", roomCode: "1009",
    benefits: ["Free breakfast", "Room upgrade"],
    inventoryItems: ["City tax"],
    deepLink: "https://orea-andels.hoteltime.cz/provider/ResDet2.aspx?idres=654451274",
  },
  {
    id: 11040002, hotelName: "OREA Hotel Angelo Praha", bookingId: 654451276,
    idStay: "654451276", tier: 2, tierLabel: "Silver",
    firstname: "Hans", surname: "Müller",
    guests: [{ id: 37980002, firstname: "Hans", surname: "Müller" }],
    arrival: isoDate(today), departure: isoDate(addDays(today, 5)),
    paxCountAdults: 1, paxCountChildren: 0,
    paxCountAgeGroup1: 0, paxCountAgeGroup2: 0, paxCountAgeGroup3: 0, paxCountAgeGroup4: 1,
    roomType: "DLXDBL", roomRateCode: "OTA-RO", roomResType: "Room",
    roomState: "Confirmed", provider: "Expedia", roomCode: "504",
    benefits: ["Welcome drink"],
    inventoryItems: ["Mini bar"],
    deepLink: "https://orea-angelo.hoteltime.cz/provider/ResDet2.aspx?idres=654451276",
  },
  {
    id: 11040003, hotelName: "OREA Place Marienbad", bookingId: 654451278,
    idStay: "654451278", tier: 4, tierLabel: "Platinum",
    firstname: "John", surname: "Smith",
    guests: [{ id: 37980003, firstname: "John", surname: "Smith" }],
    arrival: isoDate(today), departure: isoDate(addDays(today, 7)),
    paxCountAdults: 1, paxCountChildren: 0,
    paxCountAgeGroup1: 0, paxCountAgeGroup2: 0, paxCountAgeGroup3: 0, paxCountAgeGroup4: 1,
    roomType: "SUIKIN", roomRateCode: "PKG-SPA", roomResType: "Room",
    roomState: "Confirmed", provider: "Booking.com", roomCode: "112",
    benefits: ["Spa access", "Late checkout", "Airport transfer"],
    inventoryItems: ["Dinner package", "Spa package"],
    deepLink: "https://orea-marienbad.hoteltime.cz/provider/ResDet2.aspx?idres=654451278",
  },
];

// Generate mock dataset: 12 today, 10 tomorrow, 18 spread over next 7 days
export const MOCK_ARRIVING_GUESTS: ArrivingGuest[] = [
  // Pinned entries with real PMS links (always at top of today)
  ...PINNED_ARRIVALS,
  // Today — 12 reservations
  ...Array.from({ length: 12 }, (_, i) => makeReservation(i, today)),
  // Tomorrow — 10 reservations
  ...Array.from({ length: 10 }, (_, i) => makeReservation(i + 20, addDays(today, 1))),
  // Days 2–6 — 3 per day
  ...Array.from({ length: 5 }, (_, day) =>
    Array.from({ length: 3 }, (_, i) => makeReservation(i + 40 + day * 5, addDays(today, day + 2)))
  ).flat(),
];
