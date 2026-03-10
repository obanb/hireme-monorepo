import mongoose, { Schema, Document, Model } from "mongoose";
import {
  type BookingEngineApiRequest,
  bookingEngineApiRequestSubSchema,
} from "./booking-engine-shared";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface BookingEngineContact {
  email: string;
  phone: string;
}

interface BookingEngineCompanyData {
  id: string;
  dic: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  name: string;
  comment: string | null;
  contact: BookingEngineContact;
}

interface BookingEngineCompanyDoc extends Document {
  data: BookingEngineCompanyData;
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
  reprocessed?: boolean | null;
  reprocessedAt?: Date | null;
  reprocessError?: boolean | null;
  reprocessErrors?: string[] | null;
  apiRequest?: BookingEngineApiRequest | null;
  reprocessAvailable?: boolean | null;
}

export interface BookingEngineCompany {
  id: string;
  data: BookingEngineCompanyData;
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
  reprocessed: boolean | null;
  reprocessedAt: Date | null;
  reprocessError: boolean | null;
  reprocessErrors: string[] | null;
  apiRequest: BookingEngineApiRequest | null;
  reprocessAvailable: boolean | null;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const bookingEngineContactSubSchema = new Schema<BookingEngineContact>(
  {
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false }
);

const bookingEngineCompanyDataSubSchema = new Schema<BookingEngineCompanyData>(
  {
    id:         { type: String, required: true },
    dic:        { type: String, default: null },
    street:     { type: String, default: null },
    city:       { type: String, default: null },
    postalCode: { type: String, default: null },
    country:    { type: String, default: null },
    name:       { type: String, required: true },
    comment:    { type: String, default: null },
    contact:    { type: bookingEngineContactSubSchema, required: true },
  },
  { _id: false }
);

const bookingEngineCompanySchema = new Schema<BookingEngineCompanyDoc>(
  {
    data:               { type: bookingEngineCompanyDataSubSchema, required: true },
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
    reprocessed:        { type: Boolean, default: null },
    reprocessedAt:      { type: Date, default: null },
    reprocessError:     { type: Boolean, default: null },
    reprocessErrors:    { type: [String], default: null },
    apiRequest:         { type: bookingEngineApiRequestSubSchema, default: null },
    reprocessAvailable: { type: Boolean, default: null },
  },
  {
    collection: "bookingEngineCompanies",
    timestamps: false,
  }
);

bookingEngineCompanySchema.index({ originId: 1 });
bookingEngineCompanySchema.index({ notificationId: 1 });
bookingEngineCompanySchema.index({ reservationId: 1 });
bookingEngineCompanySchema.index({ hotelId: 1, created: -1 });

export const BookingEngineCompanyModel: Model<BookingEngineCompanyDoc> =
  mongoose.models.BookingEngineCompany ??
  mongoose.model<BookingEngineCompanyDoc>("BookingEngineCompany", bookingEngineCompanySchema);

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toBookingEngineCompany(doc: BookingEngineCompanyDoc): BookingEngineCompany {
  return {
    id:                 (doc._id as mongoose.Types.ObjectId).toHexString(),
    data: {
      id:         doc.data.id,
      dic:        doc.data.dic ?? null,
      street:     doc.data.street ?? null,
      city:       doc.data.city ?? null,
      postalCode: doc.data.postalCode ?? null,
      country:    doc.data.country ?? null,
      name:       doc.data.name,
      comment:    doc.data.comment ?? null,
      contact: {
        email: doc.data.contact.email,
        phone: doc.data.contact.phone,
      },
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
