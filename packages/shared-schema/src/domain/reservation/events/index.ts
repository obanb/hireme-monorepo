import { z } from 'zod';
import { ReservationCreatedEventSchema } from './created';

export * from './created';

export const ReservationEventSchema = z.discriminatedUnion('type', [
    ReservationCreatedEventSchema,
]);

export type ReservationEvent = z.infer<typeof ReservationEventSchema>;
