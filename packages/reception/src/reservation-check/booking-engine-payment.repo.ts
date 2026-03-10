import mongoose, { Schema, Document, Model } from "mongoose";
import {
  type BookingEngineApiRequest,
  bookingEngineApiRequestSubSchema,
} from "./booking-engine-shared";

// ── Interfaces ────────────────────────────────────────────────────────────────

type PaymentType = "CREDIT_CARD" | "APPLE_PAY" | "GOOGLE_PAY";

interface BookingEngineCreatePayment {
  paidAmount: number;
  paymentType: PaymentType;
  currency: string;
}

interface BookingEnginePaymentDoc extends Document {
  data: BookingEngineCreatePayment;
  created: Date;
  dateOfPayment?: Date | null;
  sourceId?: string | null;
  reservationId?: string | null;
  originId: string;
  notificationId: string;
  error: boolean;
  errors: string[];
  used: boolean;
  status?: string | null;
  retrys: number;
  msgNumber: number;
  hotelId: number;
  reprocessed?: boolean | null;
  reprocessedAt?: Date | null;
  reprocessError?: boolean | null;
  reprocessErrors?: string[] | null;
  apiRequest?: BookingEngineApiRequest | null;
  reprocessAvailable?: boolean | null;
}

export interface BookingEnginePayment {
  id: string;
  data: BookingEngineCreatePayment;
  created: Date;
  dateOfPayment: Date | null;
  sourceId: string | null;
  reservationId: string | null;
  originId: string;
  notificationId: string;
  error: boolean;
  errors: string[];
  used: boolean;
  status: string | null;
  retrys: number;
  msgNumber: number;
  hotelId: number;
  reprocessed: boolean | null;
  reprocessedAt: Date | null;
  reprocessError: boolean | null;
  reprocessErrors: string[] | null;
  apiRequest: BookingEngineApiRequest | null;
  reprocessAvailable: boolean | null;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const paymentTypeEnum = ["CREDIT_CARD", "APPLE_PAY", "GOOGLE_PAY"] as const;

const bookingEngineCreatePaymentSubSchema = new Schema<BookingEngineCreatePayment>(
  {
    paidAmount:  { type: Number, required: true },
    paymentType: { type: String, enum: paymentTypeEnum, required: true },
    currency:    { type: String, required: true },
  },
  { _id: false }
);

const bookingEnginePaymentSchema = new Schema<BookingEnginePaymentDoc>(
  {
    data:               { type: bookingEngineCreatePaymentSubSchema, required: true },
    created:            { type: Date, required: true },
    dateOfPayment:      { type: Date, default: null },
    sourceId:           { type: String, default: null },
    reservationId:      { type: String, default: null },
    originId:           { type: String, required: true },
    notificationId:     { type: String, required: true },
    error:              { type: Boolean, required: true },
    errors:             { type: [String], default: [] },
    used:               { type: Boolean, required: true },
    status:             { type: String, default: null },
    retrys:             { type: Number, required: true },
    msgNumber:          { type: Number, required: true },
    hotelId:            { type: Number, required: true },
    reprocessed:        { type: Boolean, default: null },
    reprocessedAt:      { type: Date, default: null },
    reprocessError:     { type: Boolean, default: null },
    reprocessErrors:    { type: [String], default: null },
    apiRequest:         { type: bookingEngineApiRequestSubSchema, default: null },
    reprocessAvailable: { type: Boolean, default: null },
  },
  {
    collection: "bookingEnginePayment",
    timestamps: false,
  }
);

bookingEnginePaymentSchema.index({ originId: 1 });
bookingEnginePaymentSchema.index({ notificationId: 1 });
bookingEnginePaymentSchema.index({ reservationId: 1 });
bookingEnginePaymentSchema.index({ hotelId: 1, created: -1 });

export const BookingEnginePaymentModel: Model<BookingEnginePaymentDoc> =
  mongoose.models.BookingEnginePayment ??
  mongoose.model<BookingEnginePaymentDoc>("BookingEnginePayment", bookingEnginePaymentSchema);

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toBookingEnginePayment(doc: BookingEnginePaymentDoc): BookingEnginePayment {
  return {
    id: (doc._id as mongoose.Types.ObjectId).toHexString(),
    data: {
      paidAmount:  doc.data.paidAmount,
      paymentType: doc.data.paymentType,
      currency:    doc.data.currency,
    },
    created:            doc.created,
    dateOfPayment:      doc.dateOfPayment ?? null,
    sourceId:           doc.sourceId ?? null,
    reservationId:      doc.reservationId ?? null,
    originId:           doc.originId,
    notificationId:     doc.notificationId,
    error:              doc.error,
    errors:             doc.errors,
    used:               doc.used,
    status:             doc.status ?? null,
    retrys:             doc.retrys,
    msgNumber:          doc.msgNumber,
    hotelId:            doc.hotelId,
    reprocessed:        doc.reprocessed ?? null,
    reprocessedAt:      doc.reprocessedAt ?? null,
    reprocessError:     doc.reprocessError ?? null,
    reprocessErrors:    doc.reprocessErrors ?? null,
    apiRequest:         doc.apiRequest
                          ? { method: doc.apiRequest.method, url: doc.apiRequest.url, body: doc.apiRequest.body }
                          : null,
    reprocessAvailable: doc.reprocessAvailable ?? null,
  };
}
