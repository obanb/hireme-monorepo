import type { RegistrationCard } from "../registration-cards/schemas";
import { registrationCardsService } from "../registration-cards/service";
import { buildCardHtml } from "./template";
import type { PdfBulkQuery } from "./schemas";

// ── Single card PDF ────────────────────────────────────────────────────────────

export async function generateCardPdf(card: RegistrationCard): Promise<Buffer> {
  const puppeteer = await import("puppeteer");
  const browser   = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildCardHtml(card), { waitUntil: "domcontentloaded" });
    const buffer = await page.pdf({
      format:          "A4",
      printBackground: true,
      margin:          { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    return Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}

// ── Merge multiple PDFs into one ──────────────────────────────────────────────

export async function mergePdfs(buffers: Buffer[]): Promise<Buffer> {
  const { PDFDocument } = await import("pdf-lib");

  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const src   = await PDFDocument.load(buf);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  return Buffer.from(await merged.save());
}

// ── Bulk: single browser, sequential pages, progress callback ─────────────────
//
// Reusing one browser avoids the overhead of spawning N processes in parallel,
// which is the main cause of the 30 s navigation timeout.

export async function generateBulkPdf(
  cards:      RegistrationCard[],
  onProgress: (current: number, total: number) => void,
): Promise<Buffer> {
  const puppeteer = await import("puppeteer");
  const browser   = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const buffers: Buffer[] = [];

  try {
    for (let i = 0; i < cards.length; i++) {
      const page = await browser.newPage();
      await page.setContent(buildCardHtml(cards[i]), { waitUntil: "domcontentloaded" });
      const buf = await page.pdf({
        format:          "A4",
        printBackground: true,
        margin:          { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });
      await page.close();
      buffers.push(Buffer.from(buf));
      onProgress(i + 1, cards.length);
    }
  } finally {
    await browser.close();
  }

  return mergePdfs(buffers);
}

// ── Temporary download store ──────────────────────────────────────────────────
// Holds completed bulk PDFs for 5 minutes so the frontend can download them
// after receiving the SSE "done" event.

interface PendingDownload {
  buffer:    Buffer;
  expiresAt: number;
}

const pendingDownloads = new Map<string, PendingDownload>();

// Prune expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of pendingDownloads) {
    if (entry.expiresAt < now) pendingDownloads.delete(token);
  }
}, 5 * 60 * 1000);

export function storePendingDownload(buffer: Buffer): string {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  pendingDownloads.set(token, { buffer, expiresAt: Date.now() + 5 * 60 * 1000 });
  return token;
}

export function consumePendingDownload(token: string): Buffer | null {
  const entry = pendingDownloads.get(token);
  if (!entry || entry.expiresAt < Date.now()) return null;
  pendingDownloads.delete(token);   // one-time use
  return entry.buffer;
}

// ── Public service API ────────────────────────────────────────────────────────

export const pdfService = {
  async single(id: number): Promise<Buffer | null> {
    const card = await registrationCardsService.findById(id);
    if (!card) return null;
    return generateCardPdf(card);
  },

  async bulkCards(filter: PdfBulkQuery) {
    const result = await registrationCardsService.list(
      {
        hotelId:     filter.hotelId     ?? null,
        hotelName:   filter.hotelName   ?? null,
        arrival:     filter.arrival     ?? null,
        departure:   filter.departure   ?? null,
        dateOfBirth: filter.dateOfBirth ?? null,
        search:      filter.search      ?? null,
      },
      1,
      10_000,
    );
    return result.items;
  },
};
