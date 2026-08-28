import request from 'supertest';
import { app } from '../../src/index';

describe('Health Endpoints', () => {
  it('GET /health/live sempre responde UP, sem tocar o banco', async () => {
    const response = await request(app).get('/health/live');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'UP');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('GET /health/ready reflete a conectividade com o Postgres', async () => {
    const response = await request(app).get('/health/ready');
    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('database');
  });

  it('GET /health é um alias de /health/ready', async () => {
    const response = await request(app).get('/health');
    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty('database');
  });
});
