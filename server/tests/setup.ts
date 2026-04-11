import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://test:test@localhost:5432/tourworld_test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.CORS_ORIGIN = 'http://localhost:5173';

// Global test lifecycle hooks
beforeAll(async () => {
  // Setup that runs once before all tests
  console.log('Starting test suite...');
});

afterAll(async () => {
  // Cleanup that runs once after all tests
  console.log('Test suite completed.');
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

// Utility function for creating mock responses
export const createMockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  return res;
};

// Utility function for creating mock requests
export const createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  };
};
