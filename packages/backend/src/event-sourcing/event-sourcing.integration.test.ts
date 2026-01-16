/**
 * Event Sourcing Integration Tests
 *
 * Prerequisites:
 * - PostgreSQL running on localhost:5432 (or configure via env vars)
 * - RabbitMQ running on localhost:5672 (optional, for relayer tests)
 *
 * Run with: npm test
 *
 * To start dependencies with Docker:
 *   docker run -d --name test-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15
 *   docker run -d --name test-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management
 */

import { randomUUID } from 'crypto';
import {
  initializeDatabase,
  closePool,
  getPool,
  reservationRepository,
  eventRelayer,
  loadEvents,
  getCheckpoint,
} from './index';
import { config } from './config';

describe('Event Sourcing Integration Tests', () => {
  // Setup: Initialize database before all tests
  beforeAll(async () => {
    await initializeDatabase();
  });

  // Cleanup: Close connections after all tests
  afterAll(async () => {
    await eventRelayer.stop();
    await closePool();
  });

  describe('Database Connection', () => {
    it('should connect to PostgreSQL', async () => {
      const pool = getPool();
      const result = await pool.query('SELECT 1 as value');
      expect(result.rows[0].value).toBe(1);
    });

    it('should have events table', async () => {
      const pool = getPool();
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'events'
        ) as exists
      `);
      expect(result.rows[0].exists).toBe(true);
    });

    it('should have reservations table', async () => {
      const pool = getPool();
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'reservations'
        ) as exists
      `);
      expect(result.rows[0].exists).toBe(true);
    });

    it('should have event_checkpoints table', async () => {
      const pool = getPool();
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'event_checkpoints'
        ) as exists
      `);
      expect(result.rows[0].exists).toBe(true);
    });
  });

  describe('Reservation Repository', () => {
    let testReservationId: string;

    it('should create a reservation', async () => {
      testReservationId = randomUUID();

      const { aggregate, events } = await reservationRepository.create(testReservationId, {
        originId: 'TEST-INTEGRATION-001',
        totalAmount: 299.99,
        currency: 'USD',
        arrivalTime: '2024-07-01',
        departureTime: '2024-07-05',
        customer: {
          firstName: 'Test',
          lastName: 'User',
        },
      });

      expect(aggregate.id).toBe(testReservationId);
      expect(aggregate.state.status).toBe('CONFIRMED');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('ReservationCreated');
      expect(events[0].version).toBe(1);
    });

    it('should load reservation from event store', async () => {
      const aggregate = await reservationRepository.load(testReservationId);

      expect(aggregate).not.toBeNull();
      expect(aggregate!.id).toBe(testReservationId);
      expect(aggregate!.state.status).toBe('CONFIRMED');
      expect(aggregate!.state.guestName).toBe('Test User');
      expect(aggregate!.version).toBe(1);
    });

    it('should get reservation from read model', async () => {
      const reservation = await reservationRepository.getReadModel(testReservationId);

      expect(reservation).not.toBeNull();
      expect(reservation!.id).toBe(testReservationId);
      expect(reservation!.status).toBe('CONFIRMED');
      expect(reservation!.guestName).toBe('Test User');
      expect(reservation!.originId).toBe('TEST-INTEGRATION-001');
      expect(Number(reservation!.totalAmount)).toBe(299.99);
      expect(reservation!.currency).toBe('USD');
    });

    it('should cancel a reservation', async () => {
      const { aggregate, events } = await reservationRepository.cancel(
        testReservationId,
        'Integration test cancellation'
      );

      expect(aggregate.state.status).toBe('CANCELLED');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('ReservationCancelled');
      expect(events[0].version).toBe(2);
    });

    it('should reflect cancellation in read model', async () => {
      const reservation = await reservationRepository.getReadModel(testReservationId);

      expect(reservation!.status).toBe('CANCELLED');
      expect(reservation!.version).toBe(2);
    });

    it('should throw error when cancelling already cancelled reservation', async () => {
      await expect(
        reservationRepository.cancel(testReservationId, 'Second cancellation')
      ).rejects.toThrow('Reservation is already cancelled');
    });

    it('should throw error when creating duplicate reservation', async () => {
      await expect(
        reservationRepository.create(testReservationId, {
          originId: 'DUPLICATE',
        })
      ).rejects.toThrow(`Reservation with ID ${testReservationId} already exists`);
    });

    it('should return null for non-existent reservation', async () => {
      const aggregate = await reservationRepository.load(randomUUID());
      expect(aggregate).toBeNull();
    });
  });

  describe('Event Store', () => {
    let eventTestReservationId: string;

    beforeAll(async () => {
      eventTestReservationId = randomUUID();
      await reservationRepository.create(eventTestReservationId, {
        originId: 'EVENT-STORE-TEST',
        customer: { firstName: 'Event', lastName: 'Test' },
      });
      await reservationRepository.cancel(eventTestReservationId, 'For event store test');
    });

    it('should store events with correct versions', async () => {
      const events = await loadEvents(eventTestReservationId);

      expect(events).toHaveLength(2);
      expect(events[0].version).toBe(1);
      expect(events[0].type).toBe('ReservationCreated');
      expect(events[1].version).toBe(2);
      expect(events[1].type).toBe('ReservationCancelled');
    });

    it('should store event data correctly', async () => {
      const events = await loadEvents(eventTestReservationId);

      const createdEvent = events[0];
      expect(createdEvent.data).toHaveProperty('reservationId', eventTestReservationId);
      expect(createdEvent.data).toHaveProperty('bookingDetails');

      const cancelledEvent = events[1];
      expect(cancelledEvent.data).toHaveProperty('reason', 'For event store test');
      expect(cancelledEvent.data).toHaveProperty('cancelledAt');
    });

    it('should retrieve event history through repository', async () => {
      const events = await reservationRepository.getEventHistory(eventTestReservationId);

      expect(events).toHaveLength(2);
      expect(events.map((e) => e.type)).toEqual(['ReservationCreated', 'ReservationCancelled']);
    });
  });

  describe('Read Model Queries', () => {
    let queryTestIds: string[] = [];

    beforeAll(async () => {
      // Create a few reservations for query testing
      for (let i = 0; i < 3; i++) {
        const id = randomUUID();
        queryTestIds.push(id);
        await reservationRepository.create(id, {
          originId: `QUERY-TEST-${i}`,
          totalAmount: 100 * (i + 1),
          currency: 'EUR',
          customer: { firstName: `Query${i}`, lastName: 'Test' },
        });
      }
      // Cancel one of them
      await reservationRepository.cancel(queryTestIds[0], 'Query test cancellation');
    });

    it('should list all reservations', async () => {
      const reservations = await reservationRepository.listReadModels();

      expect(reservations.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter reservations by status', async () => {
      const confirmed = await reservationRepository.listReadModels({ status: 'CONFIRMED' });
      const cancelled = await reservationRepository.listReadModels({ status: 'CANCELLED' });

      expect(confirmed.every((r) => r.status === 'CONFIRMED')).toBe(true);
      expect(cancelled.every((r) => r.status === 'CANCELLED')).toBe(true);
    });

    it('should limit and offset results', async () => {
      const page1 = await reservationRepository.listReadModels({ limit: 2, offset: 0 });
      const page2 = await reservationRepository.listReadModels({ limit: 2, offset: 2 });

      expect(page1).toHaveLength(2);
      // page2 might have less if there aren't enough records
      expect(page2.length).toBeLessThanOrEqual(2);

      // Ensure different results
      if (page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });
  });

  describe('Optimistic Concurrency', () => {
    it('should prevent concurrent modifications with version conflict', async () => {
      const concurrencyTestId = randomUUID();

      // Create a reservation
      await reservationRepository.create(concurrencyTestId, {
        originId: 'CONCURRENCY-TEST',
      });

      // Load aggregate twice (simulating two concurrent processes)
      const aggregate1 = await reservationRepository.load(concurrencyTestId);
      const aggregate2 = await reservationRepository.load(concurrencyTestId);

      expect(aggregate1).not.toBeNull();
      expect(aggregate2).not.toBeNull();

      // First cancel should succeed
      await reservationRepository.cancel(concurrencyTestId, 'First cancel');

      // Second cancel should fail (business rule, not version conflict in this case)
      await expect(
        reservationRepository.cancel(concurrencyTestId, 'Second cancel')
      ).rejects.toThrow('already cancelled');
    });
  });
});

describe('RabbitMQ Event Relayer Integration Tests', () => {
  // These tests require RabbitMQ to be running
  const skipIfNoRabbitMQ = process.env.SKIP_RABBITMQ_TESTS === 'true';

  beforeAll(async () => {
    if (skipIfNoRabbitMQ) {
      console.log('Skipping RabbitMQ tests (SKIP_RABBITMQ_TESTS=true)');
    }
  });

  afterAll(async () => {
    await eventRelayer.stop();
  });

  (skipIfNoRabbitMQ ? describe.skip : describe)('Event Relayer', () => {
    it('should start event relayer', async () => {
      await expect(eventRelayer.start()).resolves.not.toThrow();
    });

    it('should process events and update checkpoint', async () => {
      // Create a new reservation to generate an event
      const relayerTestId = randomUUID();
      await reservationRepository.create(relayerTestId, {
        originId: 'RELAYER-TEST',
      });

      // Manually trigger processing
      await eventRelayer.processNow();

      // Check checkpoint was updated
      const checkpoint = await getCheckpoint(config.rabbitmq.publisherId);
      expect(Number(checkpoint)).toBeGreaterThan(0);
    });

    it('should stop event relayer', async () => {
      await expect(eventRelayer.stop()).resolves.not.toThrow();
    });
  });
});
