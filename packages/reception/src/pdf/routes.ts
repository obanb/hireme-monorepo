import { Router, type Request, type Response } from "express";
import { registry } from "../swagger";
import { z } from "zod";
import {
  generateCardPdf,
  generateBulkPdf,
  storePendingDownload,
  consumePendingDownload,
  pdfService,
} from "./service";
import { PdfSingleParamsSchema, PdfBulkQuerySchema } from "./schemas";

export const pdfRouter = Router();

// ── OpenAPI registrations ─────────────────────────────────────────────────────

registry.registerPath({
  method: "get", path: "/pdf/registration-card/{id}",
  summary: "View or download a single registration card PDF",
  request: {
    params: PdfSingleParamsSchema,
    query:  z.object({ download: z.enum(["true", "false"]).optional() }),
  },
  responses: {
    200: { description: "PDF file",   content: { "application/pdf": { schema: z.string() } } },
    404: { description: "Not found" },
  },
});

registry.registerPath({
  method: "get", path: "/pdf/registration-cards/bulk-stream",
  summary: "SSE stream: generate bulk PDF with progress, returns download token when done",
  request: { query: PdfBulkQuerySchema },
  responses: {
    200: { description: "text/event-stream", content: { "text/event-stream": { schema: z.string() } } },
    404: { description: "No cards match filter" },
  },
});

registry.registerPath({
  method: "get", path: "/pdf/registration-cards/download/{token}",
  summary: "Download the merged PDF using a one-time token from the SSE stream",
  request: { params: z.object({ token: z.string() }) },
  responses: {
    200: { description: "PDF file",     content: { "application/pdf": { schema: z.string() } } },
    404: { description: "Token not found or expired" },
  },
});

// ── GET /api/pdf/registration-card/:id ────────────────────────────────────────

pdfRouter.get("/registration-card/:id", async (req: Request, res: Response) => {
  const parsed = PdfSingleParamsSchema.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const download = req.query.download === "true";

  try {
    const buffer = await pdfService.single(parsed.data.id);
    if (!buffer) { res.status(404).json({ error: "Registration card not found" }); return; }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="registration-card-${parsed.data.id}.pdf"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── GET /api/pdf/registration-cards/bulk-stream ───────────────────────────────
// SSE endpoint — streams progress events, then a "done" event with a token.
// Frontend EventSource listens and triggers download when done.

function sendEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

pdfRouter.get("/registration-cards/bulk-stream", async (req: Request, res: Response) => {
  const parsed = PdfBulkQuerySchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid filter params" }); return; }

  // SSE headers
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");   // disable nginx buffering
  res.flushHeaders();

  try {
    const cards = await pdfService.bulkCards(parsed.data);

    if (cards.length === 0) {
      sendEvent(res, "error", { message: "No registration cards match the filter." });
      res.end();
      return;
    }

    sendEvent(res, "start", { total: cards.length });

    const buffer = await generateBulkPdf(cards, (current, total) => {
      sendEvent(res, "progress", { current, total });
    });

    const token = storePendingDownload(buffer);
    sendEvent(res, "done", { token, total: cards.length });
    res.end();

  } catch (err: unknown) {
    sendEvent(res, "error", { message: err instanceof Error ? err.message : String(err) });
    res.end();
  }
});

// ── GET /api/pdf/registration-cards/download/:token ──────────────────────────
// One-time download — consumed immediately after use, expires after 5 min.

pdfRouter.get("/registration-cards/download/:token", (req: Request, res: Response) => {
  const buffer = consumePendingDownload(req.params.token);
  if (!buffer) { res.status(404).json({ error: "Token not found or expired." }); return; }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="registration-cards.pdf"');
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
});
