import { Schema } from "mongoose";

// Shared across booking-engine collections

export interface BookingEngineApiRequest {
  method: string;
  url: string;
  body: unknown;
}

export const bookingEngineApiRequestSubSchema = new Schema<BookingEngineApiRequest>(
  {
    method: { type: String, required: true },
    url:    { type: String, required: true },
    body:   { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);
