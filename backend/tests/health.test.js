const request = require('supertest');
const app = require('../server');

describe('Health endpoint', () => {
  it('responds with ok true', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });
});
