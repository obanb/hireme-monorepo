import { z } from 'zod';
import { BaseEventSchema } from '../../base';

export const ReservationCancelledEventSchema = BaseEventSchema.extend({
    type: z.literal('ReservationCancelled'),
    data: z.object({
        reservationId: z.string(),
        reason: z.string(),
        cancelledAt: z.string().datetime(),
    }),
});

export type ReservationCancelledEvent = z.infer<typeof ReservationCancelledEventSchema>;
