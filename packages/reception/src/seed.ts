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

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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

// Compute overall status as worst of all sub-statuses
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

const notes = [
  "Dobrý den, poprosila bych o potvrzení možnosti malé postýlky pro 2 leté dítě. Mám také bezlepkovou dietu.",
  "Please prepare champagne and flowers for our anniversary. Arriving late after 23:00.",
  "Allergy to feathers — please use hypoallergenic pillows and duvet for all beds.",
  "Vegetarian meal plan requested for all days of the stay. No meat whatsoever.",
  "We would appreciate a quiet room away from the elevator if possible. Thank you.",
  "Celebrating my husband's 50th birthday. Any small surprise would be appreciated!",
  "Early check-in requested around 10:00 if possible. Will call ahead to confirm.",
  null,
  null,
  null,
  null,
  null,
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

function generateBooking(index: number): BookingDoc {
  const createdAt = addDays(new Date("2025-12-01"), index);
  const checkinBase = addDays(new Date("2026-02-01"), index * 3 + Math.floor(Math.random() * 5));
  const nights = 1 + Math.floor(Math.random() * 7);
  const checkout = addDays(checkinBase, nights);
  const provider = pick(providers);
  const customerNote = pick(notes);
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

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;
  const col = db.collection("reservationChecks");

  // Clear existing seed data
  await col.deleteMany({});
  console.log("Cleared existing documents");

  const docs = Array.from({ length: 20 }, (_, i) => ({
    data: {
      hotelId,
      booking: generateBooking(i),
    },
    msgNumber: i + 1,
    error:     false,
    errors:    [],
    created:   addDays(new Date("2025-12-01"), i).toISOString(),
    requestId: "",
  }));

  await col.insertMany(docs);
  console.log(`Inserted ${docs.length} documents into reservationChecks`);

  // Print a summary
  for (const d of docs) {
    const b = d.data.booking;
    console.log(`  ${b.originId}  ${b.owner.padEnd(24)} ${b.status.padEnd(8)} ${b.checkin} → ${b.checkout}`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
