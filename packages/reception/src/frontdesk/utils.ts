import type { CheckInStatus } from "./schemas";

export function isTransitionAllowed(from: CheckInStatus, to: CheckInStatus): boolean {
  const allowed: Record<CheckInStatus, CheckInStatus[]> = {
    pending: ["checked_in", "no_show"],
    checked_in: ["checked_out"],
    checked_out: [],
    no_show: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

export function formatRoomLabel(roomNumber: string): string {
  return `Room ${roomNumber}`;
}
