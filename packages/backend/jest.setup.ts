/**
 * Jest Setup - Test Environment Configuration
 *
 * This file runs BEFORE EACH test file and sets up:
 * 1. Environment variables pointing to test database
 * 2. Clears the connection pool to use new config
 */

// Test database configuration - MUST be set before importing any modules
const TEST_DB_NAME = process.env.TEST_POSTGRES_DB || 'postgres_test';
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';
const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';

// Set environment variables for test database
process.env.POSTGRES_DB = TEST_DB_NAME;
process.env.POSTGRES_HOST = POSTGRES_HOST;
process.env.POSTGRES_PORT = POSTGRES_PORT;
process.env.POSTGRES_USER = POSTGRES_USER;
process.env.POSTGRES_PASSWORD = POSTGRES_PASSWORD;

// Clear DATABASE_URL to force use of individual params
delete process.env.DATABASE_URL;

console.log(`🧪 Test database: ${TEST_DB_NAME} @ ${POSTGRES_HOST}:${POSTGRES_PORT}`);
