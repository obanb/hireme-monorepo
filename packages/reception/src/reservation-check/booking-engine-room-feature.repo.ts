import mongoose, { Schema, Document, Model } from "mongoose";
import {
  type BookingEngineApiRequest,
  bookingEngineApiRequestSubSchema,
} from "./booking-engine-shared";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface BookingRoomFeatureData {
  featureMask: number;
  codes: string[];
  roomType: string;
}

interface BookingRoomFeatureDoc extends Document {
  data: BookingRoomFeatureData;
  multiroom: boolean;
  multiroomWarnings?: string | null;
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
  reprocessed?: boolean | null;
  reprocessedAt?: Date | null;
  reprocessError?: boolean | null;
  reprocessErrors?: string[] | null;
  apiRequest?: BookingEngineApiRequest | null;
  reprocessAvailable?: boolean | null;
}

export interface BookingRoomFeature {
  id: string;
  data: BookingRoomFeatureData;
  multiroom: boolean;
  multiroomWarnings: string | null;
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
  reprocessed: boolean | null;
  reprocessedAt: Date | null;
  reprocessError: boolean | null;
  reprocessErrors: string[] | null;
  apiRequest: BookingEngineApiRequest | null;
  reprocessAvailable: boolean | null;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const bookingRoomFeatureDataSubSchema = new Schema<BookingRoomFeatureData>(
  {
    featureMask: { type: Number, required: true },
    codes:       { type: [String], required: true },
    roomType:    { type: String, required: true },
  },
  { _id: false }
);

const bookingRoomFeatureSchema = new Schema<BookingRoomFeatureDoc>(
  {
    data:               { type: bookingRoomFeatureDataSubSchema, required: true },
    multiroom:          { type: Boolean, required: true },
    multiroomWarnings:  { type: String, default: null },
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
    reprocessed:        { type: Boolean, default: null },
    reprocessedAt:      { type: Date, default: null },
    reprocessError:     { type: Boolean, default: null },
    reprocessErrors:    { type: [String], default: null },
    apiRequest:         { type: bookingEngineApiRequestSubSchema, default: null },
    reprocessAvailable: { type: Boolean, default: null },
  },
  {
    collection: "bookingEngineRoomFeatures",
    timestamps: false,
  }
);

bookingRoomFeatureSchema.index({ originId: 1 });
bookingRoomFeatureSchema.index({ notificationId: 1 });
bookingRoomFeatureSchema.index({ reservationId: 1 });
bookingRoomFeatureSchema.index({ hotelId: 1, created: -1 });

export const BookingRoomFeatureModel: Model<BookingRoomFeatureDoc> =
  mongoose.models.BookingRoomFeature ??
  mongoose.model<BookingRoomFeatureDoc>("BookingRoomFeature", bookingRoomFeatureSchema);

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toBookingRoomFeature(doc: BookingRoomFeatureDoc): BookingRoomFeature {
  return {
    id:                 (doc._id as mongoose.Types.ObjectId).toHexString(),
    data: {
      featureMask: doc.data.featureMask,
      codes:       doc.data.codes,
      roomType:    doc.data.roomType,
    },
    multiroom:          doc.multiroom,
    multiroomWarnings:  doc.multiroomWarnings ?? null,
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
