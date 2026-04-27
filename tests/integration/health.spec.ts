import request from 'supertest';
import { app } from '../../src/index';

describe('Health Endpoint', () => {
  it('GET /health returns health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBeOneOf([200, 503]);
    expect(response.body).toHaveProperty('status', 'UP');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('mongodb');
  });
});

expect.extend({
  toBeOneOf(received: number, items: number[]) {
    const pass = items.includes(received);
    return {
      pass,
      message: () => `expected ${received} to be one of ${items.join(', ')}`,
    };
  },
});
