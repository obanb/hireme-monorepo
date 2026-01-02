import { z } from 'zod';

export const BaseEventSchema = z.object({
    eventId: z.string().uuid(),
    occurredAt: z.date(),
    metadata: z.record(z.unknown()).optional(),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;
