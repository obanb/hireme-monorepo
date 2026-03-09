import { Job } from "bullmq";
import { createQueue, createWorker } from "../queue";

export const FRONTDESK_QUEUE = "frontdesk";

export const frontdeskQueue = createQueue(FRONTDESK_QUEUE);

// ── Job types ─────────────────────────────────────────────────────────────────

export type FrontdeskJobName = "notify-housekeeping" | "send-checkout-receipt";

export interface NotifyHousekeepingPayload {
  roomNumber: string;
  checkInId: string;
}

export interface SendCheckoutReceiptPayload {
  checkInId: string;
  guestName: string;
  roomNumber: string;
}

// ── Producers ─────────────────────────────────────────────────────────────────

export async function enqueueNotifyHousekeeping(payload: NotifyHousekeepingPayload): Promise<void> {
  await frontdeskQueue.add("notify-housekeeping", payload, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
}

export async function enqueueCheckoutReceipt(payload: SendCheckoutReceiptPayload): Promise<void> {
  await frontdeskQueue.add("send-checkout-receipt", payload, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
}

// ── Worker ────────────────────────────────────────────────────────────────────

export function startFrontdeskWorker(): void {
  const worker = createWorker(FRONTDESK_QUEUE, async (job: Job) => {
    switch (job.name as FrontdeskJobName) {
      case "notify-housekeeping": {
        const { roomNumber, checkInId } = job.data as NotifyHousekeepingPayload;
        console.log(`[frontdesk] Notify housekeeping: room ${roomNumber} (check-in ${checkInId})`);
        // TODO: integrate with housekeeping notification system
        break;
      }
      case "send-checkout-receipt": {
        const { guestName, roomNumber } = job.data as SendCheckoutReceiptPayload;
        console.log(`[frontdesk] Send receipt to ${guestName} for room ${roomNumber}`);
        // TODO: integrate with email/print service
        break;
      }
      default:
        console.warn(`[frontdesk] Unknown job: ${job.name}`);
    }
  });

  worker.on("failed", (job, err) => {
    console.error(`[frontdesk] Job ${job?.id} failed:`, err.message);
  });
}
