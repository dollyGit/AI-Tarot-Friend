import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
  it('should return service info', async () => {
    // Basic test to ensure the test framework works
    expect(true).toBe(true);
  });

  it('should validate environment is test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
