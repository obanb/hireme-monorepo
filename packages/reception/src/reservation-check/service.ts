import mongoose from "mongoose";
import { checkReservationRepo } from "./repo";
import { BookingEnginePaymentModel } from "./booking-engine-payment.repo";
import { BookingEngineVoucherModel } from "./booking-engine-voucher.repo";
import { BookingEngineNoteModel } from "./booking-engine-note.repo";
import { BookingEngineHSKNoteModel } from "./booking-engine-hsk-note.repo";
import { BookingRoomFeatureModel } from "./booking-engine-room-feature.repo";
import { BookingEngineInventoryModel } from "./booking-engine-inventory.repo";
import { BookingEnginePromoCodeModel } from "./booking-engine-promo-code.repo";
import { BookingEngineCompanyModel } from "./booking-engine-company.repo";

function toId(doc: { _id: unknown }): string {
  return (doc._id as mongoose.Types.ObjectId).toHexString();
}

export async function getReservationCheckDetail(originId: string) {
  const [
    booking,
    paymentDocs,
    voucherDocs,
    noteDocs,
    hskNoteDocs,
    roomFeatureDocs,
    inventoryDocs,
    promoCodeDocs,
    companyDocs,
  ] = await Promise.all([
    checkReservationRepo.findByOriginId(originId),
    BookingEnginePaymentModel.find({ originId }).lean(),
    BookingEngineVoucherModel.find({ originId }).lean(),
    BookingEngineNoteModel.find({ originId }).lean(),
    BookingEngineHSKNoteModel.find({ originId }).lean(),
    BookingRoomFeatureModel.find({ originId }).lean(),
    BookingEngineInventoryModel.find({ originId }).lean(),
    BookingEnginePromoCodeModel.find({ originId }).lean(),
    BookingEngineCompanyModel.find({ originId }).lean(),
  ]);

  if (!booking) return null;

  return {
    ...booking,

    payments: paymentDocs.map((doc) => ({
      id:                 toId(doc),
      data:               doc.data,
      error:              doc.error,
      errors:             doc.errors,
      reprocessed:        doc.reprocessed ?? null,
      reprocessAvailable: doc.reprocessAvailable ?? null,
    })),

    vouchers: voucherDocs.map((doc) => ({
      id:                 toId(doc),
      data:               doc.data,
      error:              doc.error,
      errors:             doc.errors,
      reprocessed:        doc.reprocessed ?? null,
      reprocessAvailable: doc.reprocessAvailable ?? null,
    })),

    notes: noteDocs.map((doc) => ({
      id:                 toId(doc),
      data:               doc.data,
      error:              doc.error,
      errors:             doc.errors,
      reprocessed:        doc.reprocessed ?? null,
      reprocessAvailable: doc.reprocessAvailable ?? null,
    })),

    hskNotes: hskNoteDocs.map((doc) => ({
      id:                 toId(doc),
      data:               doc.data,
      error:              doc.error,
      errors:             doc.errors,
      reprocessed:        doc.reprocessed ?? null,
      reprocessAvailable: doc.reprocessAvailable ?? null,
    })),

    roomFeatures: roomFeatureDocs.map((doc) => ({
      id:                 toId(doc),
      data:               doc.data,
      error:              doc.error,
      errors:             doc.errors,
      reprocessed:        doc.reprocessed ?? null,
      reprocessAvailable: doc.reprocessAvailable ?? null,
    })),

    inventories: inventoryDocs.map((doc) => ({
      id:                 toId(doc),
      data:               doc.data,
      error:              doc.error,
      errors:             doc.errors,
      reprocessed:        doc.reprocessed ?? null,
      reprocessAvailable: doc.reprocessAvailable ?? null,
    })),

    promoCodes: promoCodeDocs.map((doc) => ({
      id:                 toId(doc),
      data:               doc.data,
      error:              doc.error,
      errors:             doc.errors,
      reprocessed:        doc.reprocessed ?? null,
      reprocessAvailable: doc.reprocessAvailable ?? null,
    })),

    companies: companyDocs.map((doc) => ({
      id:                 toId(doc),
      data:               doc.data,
      error:              doc.error,
      errors:             doc.errors,
      reprocessed:        doc.reprocessed ?? null,
      reprocessAvailable: doc.reprocessAvailable ?? null,
    })),
  };
}
