/**
 * Seed Data Module
 *
 * Provides functions to seed default data for room types matching the legacy enum values.
 */
import { v4 as uuidv4 } from 'uuid';
import { getPool } from './database';
import { roomTypeRepository } from './room-type-repository';

/**
 * Default room types matching the legacy RoomType enum values
 */
const DEFAULT_ROOM_TYPES = [
  { code: 'SINGLE', name: 'Single Room' },
  { code: 'DOUBLE', name: 'Double Room' },
  { code: 'SUITE', name: 'Suite' },
  { code: 'DELUXE', name: 'Deluxe Room' },
  { code: 'PENTHOUSE', name: 'Penthouse' },
];

/**
 * Seed default room types if they don't already exist
 */
export async function seedDefaultRoomTypes(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Check if any room types already exist
    const existingResult = await client.query('SELECT COUNT(*) as count FROM room_types');
    const existingCount = parseInt(existingResult.rows[0].count, 10);

    if (existingCount > 0) {
      console.log(`Skipping room type seeding - ${existingCount} room types already exist`);
      return;
    }

    console.log('Seeding default room types...');

    for (const roomType of DEFAULT_ROOM_TYPES) {
      const id = uuidv4();
      await roomTypeRepository.create(id, {
        code: roomType.code,
        name: roomType.name,
      });
      console.log(`  Created room type: ${roomType.code} - ${roomType.name}`);
    }

    console.log('Default room types seeded successfully');
  } finally {
    client.release();
  }
}
