import { z } from 'zod';
import { ReservationCreatedEventSchema } from './created';
import { ReservationCancelledEventSchema } from './cancelled';

export * from './created';
export * from './cancelled';

export const ReservationEventSchema = z.discriminatedUnion('type', [
    ReservationCreatedEventSchema,
    ReservationCancelledEventSchema,
]);

export type ReservationEvent = z.infer<typeof ReservationEventSchema>;
