import mongoose, { Schema, Document, Model } from "mongoose";
import {
  type BookingEngineApiRequest,
  bookingEngineApiRequestSubSchema,
} from "./booking-engine-shared";

// ── Interfaces ────────────────────────────────────────────────────────────────

type VoucherTransactionStatus = "SUCCESSFUL" | "FAILED" | "CREATED";
type VoucherCancelStatus = "OK" | "ERROR";

interface BookingEngineVoucherAmount {
  amount: number;
  currency: string;
}

interface BookingEngineCreateVoucherTransaction {
  amount: BookingEngineVoucherAmount;
  transactionId: string;
  voucherNumber: string;
  status: VoucherTransactionStatus;
  errorMessage: string | null;
}

interface BookingEngineVoucherDoc extends Document {
  data: BookingEngineCreateVoucherTransaction;
  created: Date;
  dateOfUsage?: Date | null;
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
  cancelled?: boolean | null;
  cancelledAt?: Date | null;
  cancelStatus?: VoucherCancelStatus | null;
  reprocessed?: boolean | null;
  reprocessedAt?: Date | null;
  reprocessError?: boolean | null;
  reprocessErrors?: string[] | null;
  apiRequest?: BookingEngineApiRequest | null;
  reprocessAvailable?: boolean | null;
}

export interface BookingEngineVoucher {
  id: string;
  data: BookingEngineCreateVoucherTransaction;
  created: Date;
  dateOfUsage: Date | null;
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
  cancelled: boolean | null;
  cancelledAt: Date | null;
  cancelStatus: VoucherCancelStatus | null;
  reprocessed: boolean | null;
  reprocessedAt: Date | null;
  reprocessError: boolean | null;
  reprocessErrors: string[] | null;
  apiRequest: BookingEngineApiRequest | null;
  reprocessAvailable: boolean | null;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const voucherTransactionStatusEnum = ["SUCCESSFUL", "FAILED", "CREATED"] as const;
const voucherCancelStatusEnum = ["OK", "ERROR"] as const;

const bookingEngineCreateVoucherTransactionSubSchema = new Schema<BookingEngineCreateVoucherTransaction>(
  {
    amount: {
      amount:   { type: Number, required: true },
      currency: { type: String, required: true },
    },
    transactionId: { type: String, required: true },
    voucherNumber: { type: String, required: true },
    status:        { type: String, enum: voucherTransactionStatusEnum, required: true },
    errorMessage:  { type: String, default: null },
  },
  { _id: false }
);

const bookingEngineVoucherSchema = new Schema<BookingEngineVoucherDoc>(
  {
    data:               { type: bookingEngineCreateVoucherTransactionSubSchema, required: true },
    created:            { type: Date, required: true },
    dateOfUsage:        { type: Date, default: null },
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
    cancelled:          { type: Boolean, default: null },
    cancelledAt:        { type: Date, default: null },
    cancelStatus:       { type: String, enum: [...voucherCancelStatusEnum, null], default: null },
    reprocessed:        { type: Boolean, default: null },
    reprocessedAt:      { type: Date, default: null },
    reprocessError:     { type: Boolean, default: null },
    reprocessErrors:    { type: [String], default: null },
    apiRequest:         { type: bookingEngineApiRequestSubSchema, default: null },
    reprocessAvailable: { type: Boolean, default: null },
  },
  {
    collection: "bookingEngineVouchers",
    timestamps: false,
  }
);

bookingEngineVoucherSchema.index({ originId: 1 });
bookingEngineVoucherSchema.index({ notificationId: 1 });
bookingEngineVoucherSchema.index({ reservationId: 1 });
bookingEngineVoucherSchema.index({ hotelId: 1, created: -1 });

export const BookingEngineVoucherModel: Model<BookingEngineVoucherDoc> =
  mongoose.models.BookingEngineVoucher ??
  mongoose.model<BookingEngineVoucherDoc>("BookingEngineVoucher", bookingEngineVoucherSchema);

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toBookingEngineVoucher(doc: BookingEngineVoucherDoc): BookingEngineVoucher {
  return {
    id: (doc._id as mongoose.Types.ObjectId).toHexString(),
    data: {
      amount: {
        amount:   doc.data.amount.amount,
        currency: doc.data.amount.currency,
      },
      transactionId: doc.data.transactionId,
      voucherNumber: doc.data.voucherNumber,
      status:        doc.data.status,
      errorMessage:  doc.data.errorMessage ?? null,
    },
    created:            doc.created,
    dateOfUsage:        doc.dateOfUsage ?? null,
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
    cancelled:          doc.cancelled ?? null,
    cancelledAt:        doc.cancelledAt ?? null,
    cancelStatus:       (doc.cancelStatus as VoucherCancelStatus) ?? null,
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
