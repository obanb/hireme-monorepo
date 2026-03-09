import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import type { CheckIn, CheckInStatus, CreateCheckInInput, ListCheckInsFilter } from "./schemas";

// ── Mongoose document ─────────────────────────────────────────────────────────

interface CheckInDoc extends Document {
  id: string;
  reservationId: string;
  guestName: string;
  roomNumber: string;
  status: CheckInStatus;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const checkInSchema = new Schema<CheckInDoc>(
  {
    id: { type: String, required: true, unique: true, default: uuidv4 },
    reservationId: { type: String, required: true },
    guestName: { type: String, required: true },
    roomNumber: { type: String, required: true },
    status: { type: String, enum: ["pending", "checked_in", "checked_out", "no_show"], default: "pending" },
    checkInAt: { type: Date, default: null },
    checkOutAt: { type: Date, default: null },
    notes: { type: String },
  },
  { timestamps: true }
);

const CheckInModel: Model<CheckInDoc> = mongoose.models.CheckIn ?? mongoose.model<CheckInDoc>("CheckIn", checkInSchema);

// ── Mapper ────────────────────────────────────────────────────────────────────

function toCheckIn(doc: CheckInDoc): CheckIn {
  return {
    id: doc.id,
    reservationId: doc.reservationId,
    guestName: doc.guestName,
    roomNumber: doc.roomNumber,
    status: doc.status,
    checkInAt: doc.checkInAt?.toISOString() ?? null,
    checkOutAt: doc.checkOutAt?.toISOString() ?? null,
    notes: doc.notes,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export const frontdeskRepo = {
  async create(input: CreateCheckInInput): Promise<CheckIn> {
    const doc = await CheckInModel.create({ ...input, id: uuidv4() });
    return toCheckIn(doc);
  },

  async findById(id: string): Promise<CheckIn | null> {
    const doc = await CheckInModel.findOne({ id });
    return doc ? toCheckIn(doc) : null;
  },

  async findAll(filter: ListCheckInsFilter): Promise<CheckIn[]> {
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;
    if (filter.roomNumber) query.roomNumber = filter.roomNumber;
    if (filter.date) {
      const start = new Date(filter.date);
      const end = new Date(filter.date);
      end.setDate(end.getDate() + 1);
      query.createdAt = { $gte: start, $lt: end };
    }
    const docs = await CheckInModel.find(query).sort({ createdAt: -1 });
    return docs.map(toCheckIn);
  },

  async updateStatus(id: string, status: CheckInStatus, extra?: Partial<CheckIn>): Promise<CheckIn | null> {
    const update: Record<string, unknown> = { status, ...extra };
    const doc = await CheckInModel.findOneAndUpdate({ id }, { $set: update }, { new: true });
    return doc ? toCheckIn(doc) : null;
  },
};
