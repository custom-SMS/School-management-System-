const request = require('supertest');
const app = require('../server');
const prisma = require('../prisma');

describe('System Health & Documentation Endpoints', () => {
  afterAll(async () => {
    // Gracefully disconnect Prisma after test suite finishes
    await prisma.$disconnect();
  });

  it('GET / - should return 200 and root API welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('School Management System API');
  });

  it('GET /api-docs.json - should return 200 and OpenAPI specification JSON', async () => {
    const res = await request(app).get('/api-docs.json');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('openapi');
  });

  it('GET /api/unknown-endpoint - should return 404 for nonexistent routes', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.statusCode).toBe(404);
  });
});
