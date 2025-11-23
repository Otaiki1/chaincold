// Jest setup file to suppress console output during tests
// Only show errors for actual test failures

// Store original console methods
const originalError = console.error;
const originalLog = console.log;
const originalWarn = console.warn;

// Suppress console output during tests unless JEST_VERBOSE is set
// This reduces noise from expected error logs in tests
if (!process.env.JEST_VERBOSE) {
  // Only suppress in test environment
  if (process.env.NODE_ENV === 'test') {
    // Create mock functions that do nothing
    global.console = {
      ...console,
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      // Keep info and debug for important messages
      info: console.info,
      debug: console.debug,
    };
  }
}

// Restore console methods after all tests
afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
  console.warn = originalWarn;
});

