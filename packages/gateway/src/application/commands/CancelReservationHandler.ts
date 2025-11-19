import { CancelReservationCommand } from '../../domain/reservation/commands';
import { ReservationRepository } from '../../infrastructure/repositories/ReservationRepository';
import { EventBus } from '../../infrastructure/messaging/EventBus';

export class CancelReservationHandler {
  constructor(
    private repository: ReservationRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: CancelReservationCommand): Promise<void> {
    const reservation = await this.repository.findById(command.reservationId);

    if (!reservation) {
      throw new Error(`Reservation ${command.reservationId} not found`);
    }

    const event = reservation.cancel(command);
    await this.repository.save(reservation);

    await this.eventBus.publish(event);
  }
}

