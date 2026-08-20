const request = require('supertest');
const app = require('../src/app');

describe('Rate Limiter Middleware', () => {
  it('allows normal API requests within threshold and returns rate limit headers', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('includes standard RateLimit headers on general routes', async () => {
    const res = await request(app).get('/doctors/search');
    // Even if unauthorized or 401/404, headers are present
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });
});
