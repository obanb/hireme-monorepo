/**
 * Jest Global Setup
 *
 * Runs ONCE before all test suites.
 * Creates the test database if it doesn't exist.
 */

import { Pool } from 'pg';

const TEST_DB_NAME = process.env.TEST_POSTGRES_DB || 'postgres_test';
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT || '5432');
const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';

export default async function globalSetup() {
  console.log('\n🧪 Jest Global Setup');
  console.log(`   Creating test database: ${TEST_DB_NAME}`);

  // Connect to default 'postgres' database to create test database
  const adminPool = new Pool({
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: 'postgres',
  });

  try {
    // Check if test database exists
    const result = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TEST_DB_NAME]
    );

    if (result.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log(`   ✓ Created database: ${TEST_DB_NAME}`);
    } else {
      console.log(`   ✓ Database exists: ${TEST_DB_NAME}`);
    }
  } catch (error) {
    console.error('   ✗ Failed to create test database:', error);
    throw error;
  } finally {
    await adminPool.end();
  }

  // Store config in environment for test files
  process.env.POSTGRES_DB = TEST_DB_NAME;
}
