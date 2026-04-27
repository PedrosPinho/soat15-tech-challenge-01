import request from 'supertest';
import { app } from '../../src/index';

describe('Health Endpoint', () => {
  it('GET /health returns health status', async () => {
    const response = await request(app).get('/health');
    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty('status', 'UP');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('mongodb');
  });
});
