import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { PostgresEventStore } from './infrastructure/event-store/PostgresEventStore';
import { RabbitMQEventBus } from './infrastructure/messaging/RabbitMQEventBus';
import { ReservationRepository } from './infrastructure/repositories/ReservationRepository';
import { CreateReservationHandler } from './application/commands/CreateReservationHandler';
import { ConfirmReservationHandler } from './application/commands/ConfirmReservationHandler';
import { CancelReservationHandler } from './application/commands/CancelReservationHandler';
import { ReservationProjection } from './infrastructure/projections/ReservationProjection';
import { DomainEvent } from './domain/shared/DomainEvent';
import { ReservationCreated, ReservationConfirmed, ReservationCancelled } from './domain/reservation/events';

dotenv.config();

async function main() {
  // Initialize PostgreSQL connection
  const pgPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'eventstore',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  // Initialize Event Store
  const eventStore = new PostgresEventStore(pgPool);
  console.log('✅ Event Store initialized');

  // Initialize RabbitMQ Event Bus
  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  const eventBus = new RabbitMQEventBus(rabbitmqUrl);
  await eventBus.connect();
  console.log('✅ Event Bus initialized');

  // Initialize Repository
  const repository = new ReservationRepository(eventStore);

  // Initialize Command Handlers
  const createHandler = new CreateReservationHandler(repository, eventBus);
  const confirmHandler = new ConfirmReservationHandler(repository, eventBus);
  const cancelHandler = new CancelReservationHandler(repository, eventBus);

  // Initialize Projection
  const projection = new ReservationProjection(pgPool);

  // Subscribe to events for projection
  await eventBus.subscribe('ReservationCreated', async (event: DomainEvent) => {
    await projection.handleReservationCreated(event as ReservationCreated);
  });

  await eventBus.subscribe('ReservationConfirmed', async (event: DomainEvent) => {
    await projection.handleReservationConfirmed(event as ReservationConfirmed);
  });

  await eventBus.subscribe('ReservationCancelled', async (event: DomainEvent) => {
    await projection.handleReservationCancelled(event as ReservationCancelled);
  });

  console.log('✅ Event subscriptions set up');

  // Example usage
  console.log('\n🚀 Running example...\n');

  try {
    // Example 1: Create a reservation
    console.log('1️⃣ Creating reservation...');
    await createHandler.handle({
      reservationId: 'res-001',
      hotelId: 'hotel-1',
      guestName: 'John Doe',
      checkIn: new Date('2024-06-01'),
      checkOut: new Date('2024-06-05')
    });
    console.log('✅ Reservation created\n');

    // Wait a bit for projection to process
    await new Promise(resolve => setTimeout(resolve, 500));

    // Example 2: Confirm reservation
    console.log('2️⃣ Confirming reservation...');
    await confirmHandler.handle({
      reservationId: 'res-001'
    });
    console.log('✅ Reservation confirmed\n');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Example 3: Load reservation from events
    console.log('3️⃣ Loading reservation from event store...');
    const reservation = await repository.findById('res-001');
    if (reservation) {
      console.log(`   ID: ${reservation.getId()}`);
      console.log(`   Guest: ${reservation.getGuestName()}`);
      console.log(`   Status: ${reservation.getStatus()}`);
      console.log(`   Version: ${reservation.getVersion()}`);
    }
    console.log('✅ Reservation loaded\n');

    // Example 4: Query read model
    console.log('4️⃣ Querying read model...');
    const result = await pgPool.query(
      'SELECT * FROM reservation_read_model WHERE id = $1',
      ['res-001']
    );
    console.log('   Read model:', result.rows[0]);
    console.log('✅ Read model queried\n');

    // Example 5: Cancel reservation
    console.log('5️⃣ Cancelling reservation...');
    await cancelHandler.handle({
      reservationId: 'res-001',
      reason: 'Guest request'
    });
    console.log('✅ Reservation cancelled\n');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Final state
    console.log('6️⃣ Final state:');
    const finalReservation = await repository.findById('res-001');
    if (finalReservation) {
      console.log(`   Status: ${finalReservation.getStatus()}`);
      console.log(`   Version: ${finalReservation.getVersion()}`);
    }

    const finalReadModel = await pgPool.query(
      'SELECT * FROM reservation_read_model WHERE id = $1',
      ['res-001']
    );
    console.log('   Read model status:', finalReadModel.rows[0]?.status);

  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Keep running for event processing
  console.log('\n✅ Event sourcing example complete!');
  console.log('   The service will continue running to process events...');
  console.log('   Press Ctrl+C to exit\n');
}

main().catch(console.error);

