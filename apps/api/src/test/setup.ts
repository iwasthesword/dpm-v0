import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-jwt-signing-minimum-32-chars';
process.env.DATABASE_URL = 'postgresql://dpm:dpm_dev@localhost:5432/dpm_test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock Redis
vi.mock('ioredis', () => {
  const Redis = vi.fn();
  Redis.prototype.connect = vi.fn();
  Redis.prototype.get = vi.fn();
  Redis.prototype.set = vi.fn();
  Redis.prototype.del = vi.fn();
  Redis.prototype.quit = vi.fn();
  return { default: Redis };
});

beforeAll(async () => {
  // Setup before all tests
});

afterAll(async () => {
  // Cleanup after all tests
});
