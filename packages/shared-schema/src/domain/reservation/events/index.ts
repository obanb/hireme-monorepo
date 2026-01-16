import { z } from 'zod';
import { ReservationCreatedEventSchema } from './created';
import { ReservationCancelledEventSchema } from './cancelled';
import { ReservationConfirmedEventSchema } from './confirmed';

export * from './created';
export * from './cancelled';
export * from './confirmed';

export const ReservationEventSchema = z.discriminatedUnion('type', [
    ReservationCreatedEventSchema,
    ReservationCancelledEventSchema,
    ReservationConfirmedEventSchema,
]);

export type ReservationEvent = z.infer<typeof ReservationEventSchema>;
