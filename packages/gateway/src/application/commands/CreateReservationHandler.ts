import { Reservation } from '../../domain/reservation/Reservation';
import { CreateReservationCommand } from '../../domain/reservation/commands';
import { ReservationRepository } from '../../infrastructure/repositories/ReservationRepository';
import { EventBus } from '../../infrastructure/messaging/EventBus';

export class CreateReservationHandler {
  constructor(
    private repository: ReservationRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: CreateReservationCommand): Promise<void> {
    // Create aggregate (validates business rules)
    const reservation = Reservation.create(command);

    // Save events
    await this.repository.save(reservation);

    // Publish events
    const events = reservation.getUncommittedEvents();
    await this.eventBus.publishMany(events);
  }
}

