import { z } from 'zod';
import { BaseEventSchema } from '../../base';

export const ReservationConfirmedEventSchema = BaseEventSchema.extend({
    type: z.literal('ReservationConfirmed'),
    data: z.object({
        reservationId: z.string(),
        confirmedAt: z.string().datetime(),
        confirmedBy: z.string().optional(),
    }),
});

export type ReservationConfirmedEvent = z.infer<typeof ReservationConfirmedEventSchema>;
