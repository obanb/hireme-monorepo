import { DomainEvent } from '../../domain/shared/DomainEvent';
import { ReservationCreated, ReservationConfirmed, ReservationCancelled } from '../../domain/reservation/events';
import { Pool } from 'pg';

export class ReservationProjection {
  constructor(private pool: Pool) {
    this.initializeTable();
  }

  private async initializeTable(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS reservation_read_model (
          id VARCHAR(255) PRIMARY KEY,
          hotel_id VARCHAR(255) NOT NULL,
          guest_name VARCHAR(255) NOT NULL,
          check_in DATE NOT NULL,
          check_out DATE NOT NULL,
          status VARCHAR(50) NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_hotel_id ON reservation_read_model(hotel_id);
        CREATE INDEX IF NOT EXISTS idx_status ON reservation_read_model(status);
      `);
    } finally {
      client.release();
    }
  }

  async handleReservationCreated(event: ReservationCreated): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO reservation_read_model 
         (id, hotel_id, guest_name, check_in, check_out, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          event.aggregateId,
          event.hotelId,
          event.guestName,
          event.checkIn,
          event.checkOut,
          'pending',
          event.occurredAt,
          event.occurredAt
        ]
      );
      console.log(`📊 Projection updated: ReservationCreated (${event.aggregateId})`);
    } finally {
      client.release();
    }
  }

  async handleReservationConfirmed(event: ReservationConfirmed): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE reservation_read_model 
         SET status = $1, updated_at = $2 
         WHERE id = $3`,
        ['confirmed', event.occurredAt, event.aggregateId]
      );
      console.log(`📊 Projection updated: ReservationConfirmed (${event.aggregateId})`);
    } finally {
      client.release();
    }
  }

  async handleReservationCancelled(event: ReservationCancelled): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE reservation_read_model 
         SET status = $1, updated_at = $2 
         WHERE id = $3`,
        ['cancelled', event.occurredAt, event.aggregateId]
      );
      console.log(`📊 Projection updated: ReservationCancelled (${event.aggregateId})`);
    } finally {
      client.release();
    }
  }
}

