import "dotenv/config";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://mongo:mongo@localhost:27017/reception?authSource=admin";

const statusEnum = ["GREEN", "YELLOW", "RED", "PENDING", "NONE"] as const;
type Status = typeof statusEnum[number];

const providers = ["BOOKING_ENGINE", "BOOKING_COM", "EXPEDIA", "HOTEL_TIME", "AIRBNB"];
const hotelId = 600011381;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomOriginId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function randomUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// 1 or 2 randomly
function count12(): number {
  return Math.random() < 0.5 ? 1 : 2;
}

function baseSegment(originId: string, msgNumber: number, created: Date, errored = false) {
  return {
    originId,
    notificationId: randomUuid(),
    sourceId:       randomUuid(),
    reservationId:  randomUuid(),
    created,
    error:          errored,
    errors:         errored ? ["Error processing: HotelTime error, id: 404, metadata: Reservation not found or has been canceled."] : [],
    used:           !errored,
    status:         errored ? "ERROR" : "OK",
    retrys:         errored ? 1 : 0,
    msgNumber,
    hotelId,
    reprocessed:        false,
    reprocessedAt:      null,
    reprocessError:     null,
    reprocessErrors:    null,
    reprocessAvailable: errored,
    apiRequest: {
      method: "POST",
      url:    `https://api.hoteltime.com/reservations/${originId}`,
      body:   { originId },
    },
  };
}

// ── Per-collection generators ─────────────────────────────────────────────────

function makePayments(originId: string, created: Date) {
  const paymentTypes = ["CREDIT_CARD", "APPLE_PAY", "GOOGLE_PAY"] as const;
  return Array.from({ length: count12() }, (_, i) => {
    const errored = i === 1 && Math.random() < 0.3;
    return {
      ...baseSegment(originId, i + 1, created, errored),
      data: {
        paidAmount:  Math.round(Math.random() * 5000 + 500),
        paymentType: pick([...paymentTypes]),
        currency:    "CZK",
      },
      dateOfPayment: errored ? null : addDays(created, 1),
    };
  });
}

function makeVouchers(originId: string, created: Date) {
  const voucherStatuses = ["SUCCESSFUL", "FAILED", "CREATED"] as const;
  const voucherChars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: count12() }, (_, i) => {
    const errored = i === 1 && Math.random() < 0.3;
    const status = errored ? "FAILED" : pick(["SUCCESSFUL", "SUCCESSFUL", "CREATED"]);
    return {
      ...baseSegment(originId, i + 1, created, errored),
      data: {
        amount: {
          amount:   Math.round(Math.random() * 4000 + 500),
          currency: "CZK",
        },
        transactionId: randomUuid(),
        voucherNumber: Array.from({ length: 16 }, () => voucherChars[Math.floor(Math.random() * voucherChars.length)]).join(""),
        status,
        errorMessage: errored ? "Reservation not found or has been canceled." : null,
      },
      dateOfUsage: errored ? null : addDays(created, 2),
    };
  });
}

const noteTexts = [
  "Guest requested hypoallergenic bedding.",
  "Late check-in after 23:00 confirmed.",
  "Anniversary package — flowers and champagne prepared.",
  "Baby cot requested for child aged 2.",
  "Vegetarian meal plan noted for entire stay.",
];

function makeNotes(originId: string, created: Date) {
  return Array.from({ length: count12() }, (_, i) => ({
    ...baseSegment(originId, i + 1, created),
    data:          pick(noteTexts),
    dateOfUsage:   addDays(created, 1),
    bookingDotCom: Math.random() < 0.3,
  }));
}

const hskNoteTexts = [
  "Extra towels requested.",
  "Room refresh needed after 14:00.",
  "Do not disturb until 11:00.",
  "Extra pillow for guest with back issues.",
];

function makeHSKNotes(originId: string, created: Date) {
  return Array.from({ length: count12() }, (_, i) => ({
    ...baseSegment(originId, i + 1, created),
    data:          pick(hskNoteTexts),
    dateOfUsage:   addDays(created, 1),
    bookingDotCom: false,
    roomId:        100 + Math.floor(Math.random() * 50),
  }));
}

const roomTypes = ["EXETRP", "STDTWN", "DLXDBL", "SUIKIN", "FAMRM"];
const featureCodes = [["KING"], ["TWIN"], ["BALCONY", "SEA_VIEW"], ["KING", "JACUZZI"], ["TWIN", "GARDEN_VIEW"]];

function makeRoomFeatures(originId: string, created: Date) {
  return Array.from({ length: count12() }, (_, i) => {
    const codes = pick(featureCodes);
    return {
      ...baseSegment(originId, i + 1, created),
      data: {
        featureMask: Math.pow(2, Math.floor(Math.random() * 16)),
        codes,
        roomType:    pick(roomTypes),
      },
      multiroom:         Math.random() < 0.2,
      multiroomWarnings: null,
      dateOfUsage:       addDays(created, 1),
      bookingDotCom:     Math.random() < 0.2,
    };
  });
}

const inventoryItems = [
  { id: 1, name: "Breakfast",      code: "BRK" },
  { id: 2, name: "Airport Transfer", code: "TRNS" },
  { id: 3, name: "Parking",        code: "PARK" },
  { id: 4, name: "Spa Access",     code: "SPA" },
  { id: 5, name: "Late Checkout",  code: "LTCO" },
];

function makeInventories(originId: string, created: Date) {
  return Array.from({ length: count12() }, (_, i) => {
    const itemCount = 1 + Math.floor(Math.random() * 2);
    const shuffled = [...inventoryItems].sort(() => Math.random() - 0.5).slice(0, itemCount);
    return {
      ...baseSegment(originId, i + 1, created),
      data: {
        inventories: shuffled.map((item) => ({ ...item, amount: 1 + Math.floor(Math.random() * 3) })),
        roomType:    pick(roomTypes),
      },
      multiroom:         Math.random() < 0.2,
      multiroomWarnings: null,
      dateOfUsage:       addDays(created, 1),
      bookingDotCom:     Math.random() < 0.2,
    };
  });
}

const promoCodes = ["SUMMER25", "LOYALTY10", "EARLYBIRD", "HONEYMOON", "WEEKEND15"];

function makePromoCodes(originId: string, created: Date) {
  return Array.from({ length: count12() }, (_, i) => ({
    ...baseSegment(originId, i + 1, created),
    data:        pick(promoCodes),
    dateOfUsage: addDays(created, 1),
  }));
}

const companies = [
  { id: "C001", name: "Acme Corp s.r.o.", dic: "CZ12345678", street: "Wenceslas Square 1", city: "Prague", postalCode: "110 00", country: "CZ", comment: null, contact: { email: "reservations@acme.cz", phone: "+420222333444" } },
  { id: "C002", name: "TechTravel a.s.",  dic: "CZ87654321", street: "Náměstí Míru 12",   city: "Brno",   postalCode: "602 00", country: "CZ", comment: "VIP client", contact: { email: "travel@techtravel.cz", phone: "+420533222111" } },
  { id: "C003", name: "Global Events GmbH", dic: null,       street: "Unter den Linden 5", city: "Berlin", postalCode: "10117",  country: "DE", comment: null, contact: { email: "events@globalevents.de", phone: "+493012345678" } },
];

function makeCompanies(originId: string, created: Date) {
  // Not every reservation has a company — ~60% chance
  if (Math.random() > 0.6) return [];
  return [{
    ...baseSegment(originId, 1, created),
    data:        pick(companies),
    dateOfUsage: null,
  }];
}

// ── Reservation check document ────────────────────────────────────────────────

interface BookingDoc {
  originId: string;
  hotelTimeId: number | null;
  provider: string;
  date: string;
  adultCount: number;
  childCount: number;
  checkin: string;
  checkout: string;
  owner: string;
  customerNote: string | null;
  notesStatus: Status;
  featuresStatus: Status;
  vouchersStatus: Status;
  paymentsStatus: Status;
  customerNoteStatus: Status;
  inventoriesStatus: Status;
  hskStatus: Status;
  status: Status;
}

function overallStatus(statuses: Status[]): Status {
  const order: Record<Status, number> = { RED: 0, YELLOW: 1, PENDING: 2, GREEN: 3, NONE: 4 };
  return [...statuses].sort((a, b) => order[a] - order[b])[0];
}

const guestNames = [
  "Jana Kotoučková", "Tomáš Dvořák", "Petra Marková", "Lukáš Pospíšil",
  "Eva Horáčková", "Ondřej Blaha", "Zdeněk Horák", "Marie Svobodová",
  "Jakub Novotný", "Kateřina Procházková", "Martin Kratochvíl", "Lenka Veselá",
  "Radek Blažek", "Hana Kopecká", "Pavel Šimánek", "Alena Navrátilová",
  "Jiří Fiala", "Tereza Doležalová", "Michal Krejčí", "Veronika Pokorná",
];

const notePool = [
  "Dobrý den, poprosila bych o potvrzení možnosti malé postýlky pro 2 leté dítě. Mám také bezlepkovou dietu.",
  "Please prepare champagne and flowers for our anniversary. Arriving late after 23:00.",
  "Allergy to feathers — please use hypoallergenic pillows and duvet for all beds.",
  "Vegetarian meal plan requested for all days of the stay. No meat whatsoever.",
  "We would appreciate a quiet room away from the elevator if possible. Thank you.",
  "Celebrating my husband's 50th birthday. Any small surprise would be appreciated!",
  "Early check-in requested around 10:00 if possible. Will call ahead to confirm.",
  null, null, null, null, null,
  "Wheelchair accessible room required. Please confirm availability before arrival.",
  "Connecting rooms needed for family of 5. Children ages 3, 7 and 12.",
  null,
];

function randomStatuses(hasNote: boolean): Omit<BookingDoc, "originId" | "hotelTimeId" | "provider" | "date" | "adultCount" | "childCount" | "checkin" | "checkout" | "owner" | "customerNote" | "status"> {
  const weighted = (redW: number, yellowW: number, greenW: number): Status => {
    const r = Math.random();
    if (r < redW) return "RED";
    if (r < redW + yellowW) return "YELLOW";
    if (r < redW + yellowW + greenW) return "GREEN";
    return "PENDING";
  };

  const notesStatus        = weighted(0.1, 0.15, 0.65);
  const featuresStatus     = weighted(0.05, 0.15, 0.70);
  const vouchersStatus     = Math.random() < 0.25 ? "NONE" : weighted(0.08, 0.12, 0.70);
  const paymentsStatus     = weighted(0.12, 0.18, 0.60);
  const customerNoteStatus: Status = hasNote ? weighted(0.20, 0.25, 0.45) : "NONE";
  const inventoriesStatus  = weighted(0.06, 0.14, 0.70);
  const hskStatus          = weighted(0.04, 0.10, 0.70);

  return { notesStatus, featuresStatus, vouchersStatus, paymentsStatus, customerNoteStatus, inventoriesStatus, hskStatus };
}

// ── Pinned bookings that link to PMS mock data ────────────────────────────────
// hotelTimeId matches keys in packages/reception/src/pms/mock.ts

const PINNED_BOOKINGS: BookingDoc[] = [
  {
    originId:           "BKG20001",
    hotelTimeId:        654451274,
    provider:           "BOOKING_ENGINE",
    date:               "2026-02-01T09:14:22.000Z",
    adultCount:         1,
    childCount:         0,
    checkin:            "2026-03-10",
    checkout:           "2026-03-12",
    owner:              "Malý Jára",
    customerNote:       "Vegetarian meal plan requested for all days of the stay. No meat whatsoever.",
    notesStatus:        "GREEN",
    featuresStatus:     "GREEN",
    vouchersStatus:     "NONE",
    paymentsStatus:     "GREEN",
    customerNoteStatus: "YELLOW",
    inventoriesStatus:  "GREEN",
    hskStatus:          "GREEN",
    status:             "YELLOW",
  },
  {
    originId:           "EXP20002",
    hotelTimeId:        654451276,
    provider:           "EXPEDIA",
    date:               "2026-01-15T14:30:00.000Z",
    adultCount:         1,
    childCount:         0,
    checkin:            "2026-03-10",
    checkout:           "2026-03-15",
    owner:              "Müller Hans",
    customerNote:       "Please prepare champagne and flowers for our anniversary. Arriving late after 23:00.",
    notesStatus:        "RED",
    featuresStatus:     "YELLOW",
    vouchersStatus:     "GREEN",
    paymentsStatus:     "GREEN",
    customerNoteStatus: "RED",
    inventoriesStatus:  "GREEN",
    hskStatus:          "GREEN",
    status:             "RED",
  },
  {
    originId:           "BKC20003",
    hotelTimeId:        654451278,
    provider:           "BOOKING_COM",
    date:               "2025-12-20T11:05:43.000Z",
    adultCount:         1,
    childCount:         0,
    checkin:            "2026-03-10",
    checkout:           "2026-03-17",
    owner:              "Smith John",
    customerNote:       "Wheelchair accessible room required. Please confirm availability before arrival.",
    notesStatus:        "GREEN",
    featuresStatus:     "GREEN",
    vouchersStatus:     "GREEN",
    paymentsStatus:     "YELLOW",
    customerNoteStatus: "GREEN",
    inventoriesStatus:  "GREEN",
    hskStatus:          "PENDING",
    status:             "YELLOW",
  },
  {
    originId:           "EXP20004",
    hotelTimeId:        654451282,
    provider:           "EXPEDIA",
    date:               "2026-02-10T08:20:11.000Z",
    adultCount:         1,
    childCount:         0,
    checkin:            "2026-03-09",
    checkout:           "2026-03-12",
    owner:              "Chen David",
    customerNote:       null,
    notesStatus:        "GREEN",
    featuresStatus:     "GREEN",
    vouchersStatus:     "NONE",
    paymentsStatus:     "GREEN",
    customerNoteStatus: "NONE",
    inventoriesStatus:  "GREEN",
    hskStatus:          "GREEN",
    status:             "GREEN",
  },
  {
    originId:           "DIR20005",
    hotelTimeId:        654451287,
    provider:           "HOTEL_TIME",
    date:               "2026-02-28T16:55:00.000Z",
    adultCount:         1,
    childCount:         0,
    checkin:            "2026-03-13",
    checkout:           "2026-03-14",
    owner:              "Kratochvíl Michal",
    customerNote:       "Early check-in requested around 10:00 if possible. Will call ahead to confirm.",
    notesStatus:        "GREEN",
    featuresStatus:     "GREEN",
    vouchersStatus:     "NONE",
    paymentsStatus:     "GREEN",
    customerNoteStatus: "YELLOW",
    inventoriesStatus:  "GREEN",
    hskStatus:          "GREEN",
    status:             "YELLOW",
  },
];

function generateBooking(index: number): BookingDoc {
  const createdAt = addDays(new Date("2025-12-01"), index);
  const checkinBase = addDays(new Date("2026-02-01"), index * 3 + Math.floor(Math.random() * 5));
  const nights = 1 + Math.floor(Math.random() * 7);
  const checkout = addDays(checkinBase, nights);
  const provider = pick(providers);
  const customerNote = pick(notePool);
  const adultCount = 1 + Math.floor(Math.random() * 3);
  const childCount = Math.random() < 0.3 ? Math.floor(Math.random() * 3) : 0;

  const subStatuses = randomStatuses(customerNote !== null);
  const statusValues = Object.values(subStatuses) as Status[];
  const status = overallStatus(statusValues.filter(s => s !== "NONE"));

  return {
    originId:     randomOriginId(),
    hotelTimeId:  provider === "HOTEL_TIME" ? 1000 + index : (Math.random() < 0.4 ? 1100 + index : null),
    provider,
    date:         createdAt.toISOString(),
    adultCount,
    childCount,
    checkin:      isoDate(checkinBase),
    checkout:     isoDate(checkout),
    owner:        guestNames[index % guestNames.length],
    customerNote,
    ...subStatuses,
    status,
  };
}

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;

  // ── reservationChecks ──────────────────────────────────────────────────────
  const col = db.collection("reservationChecks");
  await col.deleteMany({});

  const created = addDays(new Date("2025-12-01"), 0);

  // First 5 are pinned (linked to PMS mock data), remaining 15 are random
  const bookings: BookingDoc[] = [
    ...PINNED_BOOKINGS,
    ...Array.from({ length: 15 }, (_, i) => generateBooking(i + 5)),
  ];

  const docs = bookings.map((booking, i) => ({
    data: {
      hotelId,
      booking,
    },
    msgNumber: i + 1,
    error:     false,
    errors:    [],
    created:   addDays(new Date("2025-12-01"), i).toISOString(),
    requestId: "",
  }));

  await col.insertMany(docs);
  console.log(`Inserted ${docs.length} documents into reservationChecks`);

  const originIds = docs.map(d => ({ originId: d.data.booking.originId, created: new Date(d.created) }));

  // ── Booking engine segments ────────────────────────────────────────────────
  const collections: Array<{ name: string; make: (o: string, c: Date) => object[] }> = [
    { name: "bookingEnginePayment",    make: makePayments },
    { name: "bookingEngineVouchers",   make: makeVouchers },
    { name: "bookingEngineNotes",      make: makeNotes },
    { name: "bookingEngineHSKNotes",   make: makeHSKNotes },
    { name: "bookingEngineRoomFeatures", make: makeRoomFeatures },
    { name: "bookingEngineInventories",  make: makeInventories },
    { name: "bookingEnginePromoCodes",   make: makePromoCodes },
    { name: "bookingEngineCompanies",    make: makeCompanies },
  ];

  for (const { name, make } of collections) {
    const c = db.collection(name);
    await c.deleteMany({});
    const segDocs = originIds.flatMap(({ originId, created }) => make(originId, created));
    if (segDocs.length > 0) await c.insertMany(segDocs);
    console.log(`Inserted ${segDocs.length} documents into ${name}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\nReservation summary:");
  for (const d of docs) {
    const b = d.data.booking;
    console.log(`  ${b.originId}  ${b.owner.padEnd(24)} ${b.status.padEnd(8)} ${b.checkin} → ${b.checkout}`);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
