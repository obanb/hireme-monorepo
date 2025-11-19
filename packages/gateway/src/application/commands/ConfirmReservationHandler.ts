import { ConfirmReservationCommand } from '../../domain/reservation/commands';
import { ReservationRepository } from '../../infrastructure/repositories/ReservationRepository';
import { EventBus } from '../../infrastructure/messaging/EventBus';

export class ConfirmReservationHandler {
  constructor(
    private repository: ReservationRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: ConfirmReservationCommand): Promise<void> {
    const reservation = await this.repository.findById(command.reservationId);

    if (!reservation) {
      throw new Error(`Reservation ${command.reservationId} not found`);
    }

    const event = reservation.confirm(command);
    await this.repository.save(reservation);

    await this.eventBus.publish(event);
  }
}

