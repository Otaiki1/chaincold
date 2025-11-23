# Gateway Test Suite

Comprehensive test suite for the gateway service covering unit tests, integration tests, and edge cases.

## Test Structure

- **merkle.test.js** - Merkle tree computation tests
- **batcher.test.js** - Telemetry batching tests
- **signer.test.js** - EIP-712 signature creation tests
- **contract.test.js** - Contract interaction tests
- **filecoin.test.js** - Filecoin upload/download tests
- **api.test.js** - API endpoint tests
- **integration.test.js** - End-to-end pipeline tests

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

### Unit Tests
- ✅ Merkle root computation
- ✅ Batch collection and flushing
- ✅ Signature creation
- ✅ Contract interactions
- ✅ Filecoin operations

### Integration Tests
- ✅ Complete pipeline (collection → Filecoin → Merkle → Signature)
- ✅ Data consistency
- ✅ Error handling
- ✅ Performance benchmarks

### Edge Cases
- ✅ Empty batches
- ✅ Invalid input data
- ✅ Network errors
- ✅ Large datasets
- ✅ Concurrent operations
- ✅ Negative temperatures
- ✅ Special characters
- ✅ Timeout scenarios

## Mocking

Tests use mocks for:
- Filecoin SDK (since it requires actual API keys)
- Blockchain provider (to avoid network calls)
- External HTTP requests

## Continuous Integration

Tests are designed to run in CI/CD pipelines without requiring:
- Real blockchain connections
- Filecoin API keys
- External network access

