import { z } from "zod";

// ── Single card PDF request ────────────────────────────────────────────────────

export const PdfSingleParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ── Bulk PDF request ──────────────────────────────────────────────────────────
// Accepts the same filters as registrationCards query so the backend can
// fetch all matching records across all pages and merge them into one PDF.

export const PdfBulkQuerySchema = z.object({
  hotelId:     z.coerce.number().int().optional(),
  hotelName:   z.string().optional(),
  arrival:     z.string().optional(),   // YYYY-MM-DD
  departure:   z.string().optional(),   // YYYY-MM-DD
  dateOfBirth: z.string().optional(),   // YYYY-MM-DD
  search:      z.string().optional(),
});
export type PdfBulkQuery = z.infer<typeof PdfBulkQuerySchema>;
