import mongoose, { Schema, Document } from "mongoose";
import type { ActionType, HotelAction } from "./schemas";

// ── Mongoose models ───────────────────────────────────────────────────────────

interface IActionType extends Document {
  name:      string;
  color:     string;
  createdAt: Date;
}

const actionTypeSchema = new Schema<IActionType>({
  name:      { type: String, required: true },
  color:     { type: String, required: true },
  createdAt: { type: Date,   default: Date.now },
});

const ActionTypeModel =
  mongoose.models["ActionType"] as mongoose.Model<IActionType> ||
  mongoose.model<IActionType>("ActionType", actionTypeSchema);

interface IHotelAction extends Document {
  title:       string;
  description: string | null;
  typeId:      string;
  startDate:   string;
  endDate:     string;
  pictureUrl:  string | null;
  pdfUrl:      string | null;
  createdAt:   Date;
  updatedAt:   Date;
}

const hotelActionSchema = new Schema<IHotelAction>({
  title:       { type: String,  required: true },
  description: { type: String,  default: null },
  typeId:      { type: String,  required: true },
  startDate:   { type: String,  required: true },
  endDate:     { type: String,  required: true },
  pictureUrl:  { type: String,  default: null },
  pdfUrl:      { type: String,  default: null },
  createdAt:   { type: Date,    default: Date.now },
  updatedAt:   { type: Date,    default: Date.now },
});

const HotelActionModel =
  mongoose.models["HotelAction"] as mongoose.Model<IHotelAction> ||
  mongoose.model<IHotelAction>("HotelAction", hotelActionSchema);

// ── Mappers ───────────────────────────────────────────────────────────────────

function toActionType(doc: IActionType): ActionType {
  return {
    id:        doc._id.toString(),
    name:      doc.name,
    color:     doc.color,
    createdAt: doc.createdAt.toISOString(),
  };
}

function toHotelAction(doc: IHotelAction): HotelAction {
  return {
    id:          doc._id.toString(),
    title:       doc.title,
    description: doc.description,
    typeId:      doc.typeId,
    startDate:   doc.startDate,
    endDate:     doc.endDate,
    pictureUrl:  doc.pictureUrl,
    pdfUrl:      doc.pdfUrl,
    createdAt:   doc.createdAt.toISOString(),
    updatedAt:   doc.updatedAt.toISOString(),
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export const actionsRepo = {
  // ── Action types ────────────────────────────────────────────────────────────
  async listActionTypes(): Promise<ActionType[]> {
    const docs = await ActionTypeModel.find().sort({ createdAt: 1 });
    return docs.map(toActionType);
  },

  async getActionType(id: string): Promise<ActionType | null> {
    const doc = await ActionTypeModel.findById(id);
    return doc ? toActionType(doc) : null;
  },

  async createActionType(input: { name: string; color: string }): Promise<ActionType> {
    const doc = await ActionTypeModel.create(input);
    return toActionType(doc);
  },

  async updateActionType(id: string, input: { name?: string; color?: string }): Promise<ActionType | null> {
    const doc = await ActionTypeModel.findByIdAndUpdate(id, input, { new: true });
    return doc ? toActionType(doc) : null;
  },

  async deleteActionType(id: string): Promise<boolean> {
    const res = await ActionTypeModel.findByIdAndDelete(id);
    return !!res;
  },

  // ── Actions ─────────────────────────────────────────────────────────────────
  async listActions(filter: {
    typeId?: string | null;
    month?:  string | null;
    search?: string | null;
  }): Promise<HotelAction[]> {
    const query: Record<string, unknown> = {};

    if (filter.typeId) query["typeId"] = filter.typeId;

    if (filter.month) {
      // month = YYYY-MM → filter startDate within that month
      query["startDate"] = {
        $gte: `${filter.month}-01`,
        $lte: `${filter.month}-31`,
      };
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      query["$or"] = [
        { title:       { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const docs = await HotelActionModel.find(query).sort({ startDate: 1 });
    return docs.map(toHotelAction);
  },

  async getAction(id: string): Promise<HotelAction | null> {
    const doc = await HotelActionModel.findById(id);
    return doc ? toHotelAction(doc) : null;
  },

  async createAction(input: {
    title:       string;
    description: string | null;
    typeId:      string;
    startDate:   string;
    endDate:     string;
  }): Promise<HotelAction> {
    const doc = await HotelActionModel.create({ ...input, createdAt: new Date(), updatedAt: new Date() });
    return toHotelAction(doc);
  },

  async updateAction(id: string, input: Partial<{
    title:       string;
    description: string | null;
    typeId:      string;
    startDate:   string;
    endDate:     string;
    pictureUrl:  string | null;
    pdfUrl:      string | null;
  }>): Promise<HotelAction | null> {
    const doc = await HotelActionModel.findByIdAndUpdate(
      id,
      { ...input, updatedAt: new Date() },
      { new: true },
    );
    return doc ? toHotelAction(doc) : null;
  },

  async deleteAction(id: string): Promise<boolean> {
    const res = await HotelActionModel.findByIdAndDelete(id);
    return !!res;
  },

  async setActionPicture(id: string, pictureUrl: string): Promise<HotelAction | null> {
    return this.updateAction(id, { pictureUrl });
  },

  async setActionPdf(id: string, pdfUrl: string): Promise<HotelAction | null> {
    return this.updateAction(id, { pdfUrl });
  },
};
