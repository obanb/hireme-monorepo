import mongoose, { Schema, Document, Model } from "mongoose";
import {
  type BookingEngineApiRequest,
  bookingEngineApiRequestSubSchema,
} from "./booking-engine-shared";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface BookingEngineInventoryItem {
  id: number;
  amount: number;
  name: string;
  code: string;
}

interface BookingEngineInventoryData {
  inventories: BookingEngineInventoryItem[];
  roomType: string;
}

interface BookingEngineInventoryDoc extends Document {
  data: BookingEngineInventoryData;
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

export interface BookingEngineInventory {
  id: string;
  data: BookingEngineInventoryData;
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

const bookingEngineInventoryItemSubSchema = new Schema<BookingEngineInventoryItem>(
  {
    id:     { type: Number, required: true },
    amount: { type: Number, required: true },
    name:   { type: String, required: true },
    code:   { type: String, required: true },
  },
  { _id: false }
);

const bookingEngineInventoryDataSubSchema = new Schema<BookingEngineInventoryData>(
  {
    inventories: { type: [bookingEngineInventoryItemSubSchema], required: true },
    roomType:    { type: String, required: true },
  },
  { _id: false }
);

const bookingEngineInventorySchema = new Schema<BookingEngineInventoryDoc>(
  {
    data:               { type: bookingEngineInventoryDataSubSchema, required: true },
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
    collection: "bookingEngineInventories",
    timestamps: false,
  }
);

bookingEngineInventorySchema.index({ originId: 1 });
bookingEngineInventorySchema.index({ notificationId: 1 });
bookingEngineInventorySchema.index({ reservationId: 1 });
bookingEngineInventorySchema.index({ hotelId: 1, created: -1 });

export const BookingEngineInventoryModel: Model<BookingEngineInventoryDoc> =
  mongoose.models.BookingEngineInventory ??
  mongoose.model<BookingEngineInventoryDoc>("BookingEngineInventory", bookingEngineInventorySchema);

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toBookingEngineInventory(doc: BookingEngineInventoryDoc): BookingEngineInventory {
  return {
    id:                 (doc._id as mongoose.Types.ObjectId).toHexString(),
    data: {
      inventories: doc.data.inventories.map((item) => ({
        id:     item.id,
        amount: item.amount,
        name:   item.name,
        code:   item.code,
      })),
      roomType: doc.data.roomType,
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
