/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.integration.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000, // 30 seconds for integration tests
  forceExit: true, // Force exit after tests complete (handles open db/mq connections)

  // Test database setup
  globalSetup: '<rootDir>/jest.globalSetup.ts', // Creates test database (runs once)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Sets env vars (runs before each file)
};
