import type { PmsReservation, PmsGuestUpdateRequest, PmsResOwnerUpdateRequest } from "./schemas";
import { fetchReservationDetail, putResNoteUpdate, postCheckIn, putGuestUpdate, postResOwnerUpdate } from "./http-client";
import { MOCK_PMS_RESERVATIONS } from "./mock";

// ── Config ────────────────────────────────────────────────────────────────────

const USE_MOCK = true;

// ── Service ───────────────────────────────────────────────────────────────────

export const pmsService = {
  async getDetail(reservationId: number): Promise<PmsReservation | null> {
    if (USE_MOCK) {
      return MOCK_PMS_RESERVATIONS[reservationId] ?? null;
    }
    const res = await fetchReservationDetail(reservationId);
    if (!res.IsSuccess || !res.Data) return null;
    return res.Data;
  },

  async updateNote(reservationId: number, note: string): Promise<boolean> {
    if (USE_MOCK) return true;
    const res = await putResNoteUpdate(reservationId, note);
    return res.IsSuccess;
  },

  async checkIn(reservationId: number, resRoomId: number): Promise<{ isSuccess: boolean; errors: string | null }> {
    if (USE_MOCK) return { isSuccess: true, errors: null };
    const res = await postCheckIn(reservationId, resRoomId);
    return {
      isSuccess: res.IsSuccess,
      errors:    res.Errors ? JSON.stringify(res.Errors) : null,
    };
  },

  async updateGuest(payload: PmsGuestUpdateRequest): Promise<{ isSuccess: boolean; errors: string | null }> {
    if (USE_MOCK) return { isSuccess: true, errors: null };
    const res = await putGuestUpdate(payload);
    return {
      isSuccess: res.IsSuccess,
      errors:    res.Errors ? JSON.stringify(res.Errors) : null,
    };
  },

  async updateOwner(payload: PmsResOwnerUpdateRequest): Promise<{ isSuccess: boolean; errors: string | null }> {
    if (USE_MOCK) return { isSuccess: true, errors: null };
    const res = await postResOwnerUpdate(payload);
    return {
      isSuccess: res.IsSuccess,
      errors:    res.Errors ? JSON.stringify(res.Errors) : null,
    };
  },
};
