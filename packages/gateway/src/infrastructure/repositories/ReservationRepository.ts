import { EventStore } from '../event-store/EventStore';
import { Reservation } from '../../domain/reservation/Reservation';
import { DomainEvent } from '../../domain/shared/DomainEvent';

export class ReservationRepository {
  constructor(private eventStore: EventStore) {}

  async findById(reservationId: string): Promise<Reservation | null> {
    const events = await this.eventStore.getEvents(reservationId);

    if (events.length === 0) {
      return null;
    }

    return Reservation.fromEvents(events);
  }

  async save(reservation: Reservation): Promise<void> {
    const uncommittedEvents = reservation.getUncommittedEvents();

    if (uncommittedEvents.length === 0) {
      return;
    }

    const currentVersion = await this.eventStore.getVersion(reservation.getId());
    const expectedVersion = reservation.getVersion() - uncommittedEvents.length;

    await this.eventStore.appendEvents(
      reservation.getId(),
      uncommittedEvents,
      expectedVersion
    );

    reservation.markEventsAsCommitted();
  }
}

