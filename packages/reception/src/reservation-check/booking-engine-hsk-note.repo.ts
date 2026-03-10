import mongoose, { Schema, Document, Model } from "mongoose";
import {
  type BookingEngineApiRequest,
  bookingEngineApiRequestSubSchema,
} from "./booking-engine-shared";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface BookingEngineHSKNoteDoc extends Document {
  data: string;
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
  bookingDotCom?: boolean | null;
  roomId?: number | null;
  reprocessed?: boolean | null;
  reprocessedAt?: Date | null;
  reprocessError?: boolean | null;
  reprocessErrors?: string[] | null;
  apiRequest?: BookingEngineApiRequest | null;
  reprocessAvailable?: boolean | null;
}

export interface BookingEngineHSKNote {
  id: string;
  data: string;
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
  bookingDotCom: boolean | null;
  roomId: number | null;
  reprocessed: boolean | null;
  reprocessedAt: Date | null;
  reprocessError: boolean | null;
  reprocessErrors: string[] | null;
  apiRequest: BookingEngineApiRequest | null;
  reprocessAvailable: boolean | null;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const bookingEngineHSKNoteSchema = new Schema<BookingEngineHSKNoteDoc>(
  {
    data:               { type: String, required: true },
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
    bookingDotCom:      { type: Boolean, default: null },
    roomId:             { type: Number, default: null },
    reprocessed:        { type: Boolean, default: null },
    reprocessedAt:      { type: Date, default: null },
    reprocessError:     { type: Boolean, default: null },
    reprocessErrors:    { type: [String], default: null },
    apiRequest:         { type: bookingEngineApiRequestSubSchema, default: null },
    reprocessAvailable: { type: Boolean, default: null },
  },
  {
    collection: "bookingEngineHSKNotes",
    timestamps: false,
  }
);

bookingEngineHSKNoteSchema.index({ originId: 1 });
bookingEngineHSKNoteSchema.index({ notificationId: 1 });
bookingEngineHSKNoteSchema.index({ reservationId: 1 });
bookingEngineHSKNoteSchema.index({ hotelId: 1, created: -1 });

export const BookingEngineHSKNoteModel: Model<BookingEngineHSKNoteDoc> =
  mongoose.models.BookingEngineHSKNote ??
  mongoose.model<BookingEngineHSKNoteDoc>("BookingEngineHSKNote", bookingEngineHSKNoteSchema);

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toBookingEngineHSKNote(doc: BookingEngineHSKNoteDoc): BookingEngineHSKNote {
  return {
    id:                 (doc._id as mongoose.Types.ObjectId).toHexString(),
    data:               doc.data,
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
    bookingDotCom:      doc.bookingDotCom ?? null,
    roomId:             doc.roomId ?? null,
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
