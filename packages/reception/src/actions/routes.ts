/**
 * REST routes for file uploads (picture + PDF) on hotel actions.
 *
 * POST /api/actions/:id/picture  — upload image   (multipart/form-data, field "file")
 * POST /api/actions/:id/pdf      — upload PDF     (multipart/form-data, field "file")
 * GET  /api/actions/:id/pdf      — download PDF
 *
 * Requires: npm install multer @types/multer
 */
import { Router } from "express";
import path from "path";
import fs from "fs";
import { actionsRepo } from "./repo";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "actions");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const actionsRouter = Router();

// ── Lazy-load multer so the service starts even if multer isn't installed ─────
function getMulter() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const multer = require("multer");
    return multer({
      storage: multer.diskStorage({
        destination: (_req: unknown, _file: unknown, cb: (e: null, d: string) => void) =>
          cb(null, UPLOADS_DIR),
        filename: (_req: unknown, file: { fieldname: string; originalname: string }, cb: (e: null, n: string) => void) => {
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    });
  } catch {
    return null;
  }
}

// ── Picture upload ─────────────────────────────────────────────────────────────
actionsRouter.post("/:id/picture", async (req, res) => {
  const multer = getMulter();
  if (!multer) {
    res.status(501).json({ error: "multer not installed — run: npm install multer" });
    return;
  }

  multer.single("file")(req, res, async (err: unknown) => {
    if (err) { res.status(400).json({ error: String(err) }); return; }

    const file = (req as unknown as { file?: { filename: string } }).file;
    if (!file) { res.status(400).json({ error: "No file uploaded" }); return; }

    const url = `/uploads/actions/${file.filename}`;
    const action = await actionsRepo.setActionPicture(req.params.id, url);
    if (!action) { res.status(404).json({ error: "Action not found" }); return; }

    res.json({ pictureUrl: url, action });
  });
});

// ── PDF upload ────────────────────────────────────────────────────────────────
actionsRouter.post("/:id/pdf", async (req, res) => {
  const multer = getMulter();
  if (!multer) {
    res.status(501).json({ error: "multer not installed — run: npm install multer" });
    return;
  }

  multer.single("file")(req, res, async (err: unknown) => {
    if (err) { res.status(400).json({ error: String(err) }); return; }

    const file = (req as unknown as { file?: { filename: string; mimetype: string } }).file;
    if (!file) { res.status(400).json({ error: "No file uploaded" }); return; }
    if (file.mimetype !== "application/pdf") {
      res.status(400).json({ error: "Only PDF files allowed" }); return;
    }

    const url = `/uploads/actions/${file.filename}`;
    const action = await actionsRepo.setActionPdf(req.params.id, url);
    if (!action) { res.status(404).json({ error: "Action not found" }); return; }

    res.json({ pdfUrl: url, action });
  });
});

// ── PDF download ──────────────────────────────────────────────────────────────
actionsRouter.get("/:id/pdf", async (req, res) => {
  const action = await actionsRepo.getAction(req.params.id);
  if (!action || !action.pdfUrl) {
    res.status(404).json({ error: "PDF not found" });
    return;
  }

  const filename = path.basename(action.pdfUrl);
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found on disk" });
    return;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${action.title}.pdf"`);
  fs.createReadStream(filePath).pipe(res);
});
