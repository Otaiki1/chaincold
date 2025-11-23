# Gateway Testing Guide

## Overview

The gateway service includes comprehensive test coverage with unit tests, integration tests, and edge case handling.

## Running Tests

```bash
# Install dependencies first
npm install

# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Unit Tests

- **merkle.test.js** - Tests Merkle tree computation
  - Single and multiple samples
  - Consistency checks
  - Edge cases (empty arrays, large batches)
  - Proof verification

- **batcher.test.js** - Tests telemetry batching
  - Batch collection
  - Timeout behavior
  - Multiple shipments
  - Concurrent operations

- **signer.test.js** - Tests EIP-712 signature creation
  - Shipment key computation
  - Signature structure
  - Negative temperatures

- **contract.test.js** - Tests contract interactions
  - Nonce retrieval
  - Domain separator
  - Transaction submission
  - Error handling

- **filecoin.test.js** - Tests Filecoin operations
  - Upload functionality
  - Download functionality
  - Error handling
  - Edge cases

### Integration Tests

- **api.test.js** - Tests API endpoints
  - POST /telemetry validation
  - GET /shipment/:id
  - GET /batch/:shipmentKey
  - GET /health
  - Error responses

- **integration.test.js** - End-to-end pipeline tests
  - Complete data flow
  - Data consistency
  - Performance benchmarks

## Edge Cases Covered

### Input Validation
- ✅ Missing required fields
- ✅ Invalid data types
- ✅ Negative temperatures
- ✅ Very large values
- ✅ Special characters
- ✅ Empty strings
- ✅ Invalid JSON

### Network & Errors
- ✅ Network failures
- ✅ Filecoin upload errors
- ✅ Contract transaction failures
- ✅ Invalid CIDs
- ✅ Timeout scenarios

### Data Handling
- ✅ Empty batches
- ✅ Single sample batches
- ✅ Very large batches (1000+ samples)
- ✅ Concurrent batch processing
- ✅ Rapid sample additions

### Performance
- ✅ Large dataset processing
- ✅ Concurrent operations
- ✅ Memory efficiency

## Mocking Strategy

Tests use mocks for:
- **Filecoin SDK** - Avoids need for actual API keys
- **Blockchain Provider** - Prevents network calls during tests
- **HTTP Requests** - Isolates unit tests

## Test Coverage Goals

- Unit tests: >90% coverage
- Integration tests: All critical paths
- Edge cases: All identified scenarios

## Writing New Tests

When adding new features:

1. **Add unit tests** for the new module
2. **Add integration tests** if it affects the pipeline
3. **Add edge cases** for error scenarios
4. **Update this document** with new test categories

### Example Test Structure

```javascript
describe('NewFeature', () => {
  describe('happy path', () => {
    test('should work correctly', () => {
      // Test normal operation
    });
  });

  describe('edge cases', () => {
    test('should handle empty input', () => {
      // Test edge case
    });
  });

  describe('error handling', () => {
    test('should handle network errors', () => {
      // Test error scenario
    });
  });
});
```

## Continuous Integration

Tests are designed to:
- Run without external dependencies
- Complete in < 30 seconds
- Work in CI/CD pipelines
- Provide clear failure messages

## Debugging Tests

```bash
# Run specific test file
npm test -- merkle.test.js

# Run tests matching pattern
npm test -- -t "should compute root"

# Run with verbose output
npm test -- --verbose

# Run with coverage for specific file
npm test -- --coverage merkle.test.js
```

## Common Issues

### Tests failing due to module cache
- Use `jest.resetModules()` in `beforeAll`
- Set `NODE_ENV=test` before imports

### Mock not working
- Ensure mocks are defined before imports
- Check mock function names match exactly

### Async test timeouts
- Increase timeout: `jest.setTimeout(10000)`
- Use proper async/await patterns

## Next Steps

- [ ] Add performance benchmarks
- [ ] Add load testing
- [ ] Add contract interaction tests with testnet
- [ ] Add Filecoin integration tests with testnet

