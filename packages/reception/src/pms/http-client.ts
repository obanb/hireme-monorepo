import type { PmsApiResponse, PmsMutationResponse, PmsGuestUpdateRequest, PmsResOwnerUpdateRequest } from "./schemas";

// ── Config ────────────────────────────────────────────────────────────────────

const PMS_BASE_URL = process.env.PMS_BASE_URL ?? "https://pms.orea.internal";
const PMS_API_KEY  = process.env.PMS_API_KEY  ?? "";

// ── Base request ──────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${PMS_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(PMS_API_KEY ? { "X-Api-Key": PMS_API_KEY } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`PMS API error ${res.status} ${res.statusText} — ${url}`);
  }

  return res.json() as Promise<T>;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * GET /Reservation/Detail?id=<reservationId>
 * Fetch full reservation detail from the PMS.
 */
export async function fetchReservationDetail(
  reservationId: number,
): Promise<PmsApiResponse> {
  return request<PmsApiResponse>(
    `/Reservation/Detail?id=${reservationId}`,
    { method: "GET" },
  );
}

/**
 * PUT /Reservation/ResNoteUpdate
 * Update the free-text note on a reservation.
 */
export async function putResNoteUpdate(
  reservationId: number,
  note: string,
): Promise<PmsMutationResponse> {
  return request<PmsMutationResponse>(
    "/Reservation/ResNoteUpdate",
    {
      method: "PUT",
      body:   JSON.stringify({ IDReservation: reservationId, Note: note }),
    },
  );
}

/**
 * POST /ResOp/CheckIn
 * Perform check-in for a reservation room.
 */
export async function postCheckIn(
  reservationId: number,
  resRoomId: number,
): Promise<PmsMutationResponse> {
  return request<PmsMutationResponse>(
    "/ResOp/CheckIn",
    {
      method: "POST",
      body:   JSON.stringify({ IDReservation: reservationId, IDResRoom: resRoomId }),
    },
  );
}

/**
 * PUT /Guest/Update
 * Update guest (citizen) data on a reservation room.
 */
export async function putGuestUpdate(
  payload: PmsGuestUpdateRequest,
): Promise<PmsMutationResponse> {
  return request<PmsMutationResponse>(
    "/Guest/Update",
    {
      method: "PUT",
      body:   JSON.stringify(payload),
    },
  );
}

/**
 * POST /Reservation/ResOwnerUpdate
 * Update the owner (subject) of a reservation — citizen or company.
 */
export async function postResOwnerUpdate(
  payload: PmsResOwnerUpdateRequest,
): Promise<PmsMutationResponse> {
  return request<PmsMutationResponse>(
    "/Reservation/ResOwnerUpdate",
    {
      method: "POST",
      body:   JSON.stringify(payload),
    },
  );
}
