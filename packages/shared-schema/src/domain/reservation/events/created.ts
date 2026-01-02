import { z } from 'zod';
import { BaseEventSchema } from '../../base';
import { BookingEngineCreateBookingSchema } from '../reservation';

export const ReservationCreatedEventSchema = BaseEventSchema.extend({
    type: z.literal('ReservationCreated'),
    data: z.object({
        reservationId: z.string(),
        // We can reuse the existing schema or parts of it, or define explicit fields
        // For now, let's include the booking details
        bookingDetails: BookingEngineCreateBookingSchema,
    }),
});

export type ReservationCreatedEvent = z.infer<typeof ReservationCreatedEventSchema>;
