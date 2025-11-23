module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/', '/test/'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    '*.js',
    '!jest.config.js',
    '!index.js', // Exclude main entry point from coverage
  ],
  // Suppress console output during tests (use --verbose to see all output)
  silent: false,
  // Only show console output for actual failures
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

