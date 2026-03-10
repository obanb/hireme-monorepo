import mongoose, { Schema, Document, Model } from "mongoose";
import type { CheckReservationBooking, CheckReservationStatus } from "./schemas";

// ── Mongoose document (mirrors the real `reservationChecks` collection) ────────

interface BookingSubDoc {
  originId: string;
  hotelTimeId?: number | null;
  provider: string;
  date: string;
  adultCount: number;
  childCount: number;
  checkin: string;
  checkout: string;
  owner: string;
  customerNote?: string | null;
  notesStatus: CheckReservationStatus;
  featuresStatus: CheckReservationStatus;
  vouchersStatus: CheckReservationStatus;
  paymentsStatus: CheckReservationStatus;
  customerNoteStatus: CheckReservationStatus;
  inventoriesStatus: CheckReservationStatus;
  hskStatus: CheckReservationStatus;
  status: CheckReservationStatus;
}

interface ReservationCheckDoc extends Document {
  data: {
    hotelId: number;
    booking: BookingSubDoc;
  };
  msgNumber?: number;
  error?: boolean;
  errors?: unknown[];
  created?: string;
  requestId?: string;
}

const statusEnum = ["GREEN", "YELLOW", "RED", "PENDING", "NONE"] as const;
const statusField = { type: String, enum: statusEnum, required: true };

const bookingSubSchema = new Schema<BookingSubDoc>(
  {
    originId:           { type: String, required: true },
    hotelTimeId:        { type: Number, default: null },
    provider:           { type: String, required: true },
    date:               { type: String, required: true },
    adultCount:         { type: Number, required: true },
    childCount:         { type: Number, required: true },
    checkin:            { type: String, required: true },
    checkout:           { type: String, required: true },
    owner:              { type: String, required: true },
    customerNote:       { type: String, default: null },
    notesStatus:        statusField,
    featuresStatus:     statusField,
    vouchersStatus:     statusField,
    paymentsStatus:     statusField,
    customerNoteStatus: statusField,
    inventoriesStatus:  statusField,
    hskStatus:          statusField,
    status:             statusField,
  },
  { _id: false }
);

const reservationCheckSchema = new Schema<ReservationCheckDoc>(
  {
    data: {
      hotelId: { type: Number, required: true },
      booking: { type: bookingSubSchema, required: true },
    },
    msgNumber:  { type: Number },
    error:      { type: Boolean, default: false },
    errors:     { type: [Schema.Types.Mixed], default: [] },
    created:    { type: String },
    requestId:  { type: String, default: "" },
  },
  {
    collection: "reservationChecks",
    timestamps: false,
  }
);

// Index on the nested originId for fast lookups
reservationCheckSchema.index({ "data.booking.originId": 1 }, { unique: true });

const ReservationCheckModel: Model<ReservationCheckDoc> =
  mongoose.models.ReservationCheck ??
  mongoose.model<ReservationCheckDoc>("ReservationCheck", reservationCheckSchema);

// ── Mapper ────────────────────────────────────────────────────────────────────

function toBooking(doc: ReservationCheckDoc): CheckReservationBooking {
  const b = doc.data.booking;
  return {
    originId:           b.originId,
    hotelTimeId:        b.hotelTimeId ?? null,
    provider:           b.provider,
    date:               b.date,
    adultCount:         b.adultCount,
    childCount:         b.childCount,
    checkin:            b.checkin,
    checkout:           b.checkout,
    owner:              b.owner,
    customerNote:       b.customerNote ?? null,
    notesStatus:        b.notesStatus,
    featuresStatus:     b.featuresStatus,
    vouchersStatus:     b.vouchersStatus,
    paymentsStatus:     b.paymentsStatus,
    customerNoteStatus: b.customerNoteStatus,
    inventoriesStatus:  b.inventoriesStatus,
    hskStatus:          b.hskStatus,
    status:             b.status,
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export interface PaginatedBookings {
  items: CheckReservationBooking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const checkReservationRepo = {
  async findAll(page = 1, limit = 10): Promise<PaginatedBookings> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      ReservationCheckModel.find()
        .sort({ "data.booking.date": -1 })
        .skip(skip)
        .limit(limit),
      ReservationCheckModel.countDocuments(),
    ]);
    return {
      items: docs.map(toBooking),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findByOriginId(originId: string): Promise<CheckReservationBooking | null> {
    const doc = await ReservationCheckModel.findOne({ "data.booking.originId": originId });
    return doc ? toBooking(doc) : null;
  },
};
