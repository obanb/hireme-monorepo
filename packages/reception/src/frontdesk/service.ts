import { frontdeskRepo } from "./repo";
import { enqueueNotifyHousekeeping, enqueueCheckoutReceipt } from "./mq";
import type { CheckIn, CreateCheckInInput, ListCheckInsFilter } from "./schemas";

export const frontdeskService = {
  async createCheckIn(input: CreateCheckInInput): Promise<CheckIn> {
    const checkIn = await frontdeskRepo.create(input);
    return checkIn;
  },

  async performCheckIn(id: string): Promise<CheckIn> {
    const checkIn = await frontdeskRepo.updateStatus(id, "checked_in", {
      checkInAt: new Date().toISOString(),
    });
    if (!checkIn) throw new Error(`CheckIn ${id} not found`);
    return checkIn;
  },

  async performCheckOut(id: string, notes?: string): Promise<CheckIn> {
    const checkIn = await frontdeskRepo.updateStatus(id, "checked_out", {
      checkOutAt: new Date().toISOString(),
      notes,
    });
    if (!checkIn) throw new Error(`CheckIn ${id} not found`);

    await enqueueNotifyHousekeeping({ roomNumber: checkIn.roomNumber, checkInId: checkIn.id });
    await enqueueCheckoutReceipt({ checkInId: checkIn.id, guestName: checkIn.guestName, roomNumber: checkIn.roomNumber });

    return checkIn;
  },

  async markNoShow(id: string): Promise<CheckIn> {
    const checkIn = await frontdeskRepo.updateStatus(id, "no_show");
    if (!checkIn) throw new Error(`CheckIn ${id} not found`);
    return checkIn;
  },

  async getCheckIn(id: string): Promise<CheckIn | null> {
    return frontdeskRepo.findById(id);
  },

  async listCheckIns(filter: ListCheckInsFilter = {}): Promise<CheckIn[]> {
    return frontdeskRepo.findAll(filter);
  },
};
