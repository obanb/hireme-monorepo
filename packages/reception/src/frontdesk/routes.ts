import { Router, Request, Response } from "express";
import { registry } from "../swagger";
import { frontdeskService } from "./service";
import {
  CheckInSchema,
  CreateCheckInInputSchema,
  CheckOutInputSchema,
  ListCheckInsFilterSchema,
} from "./schemas";
import { z } from "zod";

export const frontdeskRouter = Router();

// ── OpenAPI registrations ─────────────────────────────────────────────────────

registry.register("CheckIn", CheckInSchema);
registry.register("CreateCheckInInput", CreateCheckInInputSchema);
registry.register("CheckOutInput", CheckOutInputSchema);

registry.registerPath({
  method: "get",
  path: "/frontdesk/checkins",
  summary: "List check-ins",
  request: {
    query: ListCheckInsFilterSchema,
  },
  responses: {
    200: {
      description: "List of check-ins",
      content: { "application/json": { schema: z.array(CheckInSchema) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/frontdesk/checkins",
  summary: "Create a check-in record",
  request: {
    body: { content: { "application/json": { schema: CreateCheckInInputSchema } } },
  },
  responses: {
    201: {
      description: "Created check-in",
      content: { "application/json": { schema: CheckInSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/frontdesk/checkins/{id}",
  summary: "Get a check-in by ID",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Check-in found", content: { "application/json": { schema: CheckInSchema } } },
    404: { description: "Not found" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/frontdesk/checkins/{id}/checkin",
  summary: "Perform check-in",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Updated check-in", content: { "application/json": { schema: CheckInSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/frontdesk/checkins/{id}/checkout",
  summary: "Perform check-out",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: CheckOutInputSchema.omit({ id: true }) } } },
  },
  responses: {
    200: { description: "Updated check-in", content: { "application/json": { schema: CheckInSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/frontdesk/checkins/{id}/noshow",
  summary: "Mark as no-show",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Updated check-in", content: { "application/json": { schema: CheckInSchema } } },
  },
});

// ── Route handlers ────────────────────────────────────────────────────────────

frontdeskRouter.get("/checkins", async (req: Request, res: Response) => {
  const filter = ListCheckInsFilterSchema.parse(req.query);
  const items = await frontdeskService.listCheckIns(filter);
  res.json(items);
});

frontdeskRouter.post("/checkins", async (req: Request, res: Response) => {
  const input = CreateCheckInInputSchema.parse(req.body);
  const checkIn = await frontdeskService.createCheckIn(input);
  res.status(201).json(checkIn);
});

frontdeskRouter.get("/checkins/:id", async (req: Request, res: Response) => {
  const checkIn = await frontdeskService.getCheckIn(req.params.id);
  if (!checkIn) return res.status(404).json({ error: "Not found" });
  res.json(checkIn);
});

frontdeskRouter.patch("/checkins/:id/checkin", async (req: Request, res: Response) => {
  const checkIn = await frontdeskService.performCheckIn(req.params.id);
  res.json(checkIn);
});

frontdeskRouter.patch("/checkins/:id/checkout", async (req: Request, res: Response) => {
  const { notes } = req.body as { notes?: string };
  const checkIn = await frontdeskService.performCheckOut(req.params.id, notes);
  res.json(checkIn);
});

frontdeskRouter.patch("/checkins/:id/noshow", async (req: Request, res: Response) => {
  const checkIn = await frontdeskService.markNoShow(req.params.id);
  res.json(checkIn);
});
