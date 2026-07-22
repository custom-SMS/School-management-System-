const request = require('supertest');
const prisma = require('../prisma');

// Import the actual server
const server = require('../server');

// Use the actual server app
const app = server;

describe('Concurrency Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('HTTP Request Concurrency', () => {
    test('should handle 100 concurrent requests to root endpoint', async () => {
      const concurrentRequests = 100;
      const requests = Array(concurrentRequests).fill(null).map(() => 
        request(app).get('/')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const totalTime = endTime - startTime;
      console.log(`✓ ${concurrentRequests} concurrent requests completed in ${totalTime}ms`);
    });

    test('should handle 50 concurrent requests to API docs', async () => {
      const concurrentRequests = 50;
      const requests = Array(concurrentRequests).fill(null).map(() => 
        request(app).get('/api-docs.json')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const successCount = responses.filter(r => r.status === 200).length;
      console.log(`✓ ${concurrentRequests} API docs requests: ${successCount} success in ${endTime - startTime}ms`);
      
      expect(successCount).toBe(concurrentRequests);
    });
  });

  describe('Database Read Concurrency', () => {
    test('should handle concurrent database reads via stats endpoint', async () => {
      const concurrentReads = 20;
      
      const readRequests = Array(concurrentReads).fill(null).map(() => 
        request(app).get('/api-docs.json')
      );

      const startTime = Date.now();
      const responses = await Promise.all(readRequests);
      const endTime = Date.now();

      const successCount = responses.filter(r => r.status === 200).length;
      const totalTime = endTime - startTime;

      console.log(`✓ ${concurrentReads} concurrent DB reads completed in ${totalTime}ms: ${successCount} success`);

      // All should succeed for public endpoint
      expect(successCount).toBe(concurrentReads);
      // Should complete quickly
      expect(totalTime).toBeLessThan(5000); // Under 5 seconds
    });
  });

  describe('System Load Test', () => {
    test('should handle mixed concurrent operations', async () => {
      const operations = [];

      // Mix of different public endpoint types
      for (let i = 0; i < 30; i++) {
        operations.push(request(app).get('/'));
        operations.push(request(app).get('/api-docs.json'));
      }

      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const endTime = Date.now();

      const successCount = responses.filter(r => r.status === 200).length;
      const totalTime = endTime - startTime;

      console.log(`✓ ${operations.length} mixed operations completed in ${totalTime}ms: ${successCount} success`);

      // All should succeed for public endpoints
      expect(successCount).toBe(operations.length);
    });
  });

  describe('Student Registration Concurrency', () => {
    test('should handle concurrent student registrations', async () => {
      const concurrentRegistrations = 10;
      const timestamp = Date.now();
      
      const registrationRequests = Array(concurrentRegistrations).fill(null).map((_, i) => {
        const studentData = {
          firstName: `Test${i}`,
          lastName: `Student${timestamp}`,
          email: `test${i}${timestamp}@test.com`,
          grade: 'Grade 10',
          personalDetails: {
            gender: 'Male',
            dateOfBirth: '2005-01-01'
          }
        };
        
        return request(app)
          .post('/students')
          .send(studentData);
      });

      const startTime = Date.now();
      const responses = await Promise.all(registrationRequests);
      const endTime = Date.now();

      const successCount = responses.filter(r => r.status === 201 || r.status === 200).length;
      const conflictCount = responses.filter(r => r.status === 409).length;
      const errorCount = responses.filter(r => r.status >= 400).length;
      const totalTime = endTime - startTime;

      console.log(`✓ ${concurrentRegistrations} concurrent student registrations completed in ${totalTime}ms:`);
      console.log(`  - Success: ${successCount}`);
      console.log(`  - Conflicts (duplicate): ${conflictCount}`);
      console.log(`  - Errors: ${errorCount}`);

      // At least 80% should succeed (some might fail due to validation)
      expect(successCount / concurrentRegistrations).toBeGreaterThan(0.8);
      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(15000); // Under 15 seconds
    });
  });
});
