// jest.config.js — Jest configuration for the Express backend.

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',

  // Runs before each test FILE — sets NODE_ENV=test so db.js uses :memory:
  setupFiles: ['./tests/setup.js'],

  // Only pick up tests inside /tests
  testMatch: ['**/tests/**/*.test.js'],

  // Print each test name as it runs
  verbose: true,

  // Force Jest to exit after all tests finish (closes the open SQLite handle)
  forceExit: true,
};
