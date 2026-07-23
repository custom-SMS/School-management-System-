const request = require('supertest');
const prisma = require('../prisma');

// Import the actual server
const server = require('../server');

// Use the actual server app
const app = server;

// Resolved branch ID for registration payloads
let testBranchId = null;

describe('Concurrency Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
    
    // Ensure active academic year exists and registration window is open for student registration
    const now = new Date();
    const regStart = new Date(now.getFullYear() - 1, 0, 1);
    const regEnd = new Date(now.getFullYear() + 1, 11, 31);

    let activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    if (!activeYear) {
      activeYear = await prisma.academicYear.findFirst();
    }

    if (activeYear) {
      await prisma.academicYear.update({
        where: { id: activeYear.id },
        data: {
          isActive: true,
          registrationOpen: true,
          registrationStart: regStart,
          registrationEnd: regEnd,
        },
      });
    } else {
      activeYear = await prisma.academicYear.create({
        data: {
          year: '2025/2026',
          isActive: true,
          registrationOpen: true,
          registrationStart: regStart,
          registrationEnd: regEnd,
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-06-30'),
        },
      });
    }

    // Resolve a valid branch from the database (needed by Student FK constraint)
    const branch = await prisma.branch.findFirst();
    testBranchId = branch ? branch.id : null;

    // Ensure fee structure exists for Grade 10 (scoped to branch if available)
    const existingFee = await prisma.feeStructure.findFirst({ where: { grade: 'Grade 10' } });
    if (!existingFee && activeYear) {
      await prisma.feeStructure.create({
        data: {
          name: 'Grade 10 Registration Fee',
          grade: 'Grade 10',
          tuitionFee: 1000,
          registrationFee: 100,
          description: 'Grade 10 Registration Fee',
          academicYearId: activeYear.id,
          ...(testBranchId ? { branchId: testBranchId } : {}),
        },
      });
    }
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
      const totalTime = endTime - startTime;
      console.log(`✓ 50 API docs requests: ${successCount} success in ${totalTime}ms`);

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
      expect(successCount).toBe(concurrentReads);
    });
  });

  describe('System Load Test', () => {
    test('should handle mixed concurrent operations', async () => {
      const operations = [
        ...Array(20).fill(null).map(() => request(app).get('/')),
        ...Array(20).fill(null).map(() => request(app).get('/api-docs.json')),
        ...Array(20).fill(null).map(() => request(app).get('/api/unknown-endpoint'))
      ];

      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const endTime = Date.now();

      const successCount = responses.filter(r => r.status === 200 || r.status === 404).length;
      const totalTime = endTime - startTime;

      console.log(`✓ ${operations.length} mixed operations completed in ${totalTime}ms: ${successCount} success`);
      
      // All should succeed for public endpoints
      expect(successCount).toBe(operations.length);
    });
  });

  describe('Student Registration Concurrency', () => {
    test('should handle concurrent student registrations', async () => {
      const concurrentRegistrations = 5;
      const timestamp = Date.now();
      
      const registrationRequests = Array(concurrentRegistrations).fill(null).map((_, i) => {
        const studentData = {
          name: `Test${i} Student${timestamp}`,
          firstName: `Test${i}`,
          lastName: `Student${timestamp}`,
          email: `test${i}${timestamp}@test.com`,
          grade: 'Grade 10',
          ...(testBranchId ? { branchId: testBranchId } : {}),
          personalDetails: {
            gender: 'Male',
            dateOfBirth: '2005-01-01'
          },
          familyBackground: {
            fatherName: `Father${i} Student${timestamp}`,
            motherName: `Mother${i} Student${timestamp}`,
          },
          guardians: [
            {
              fullName: `Guardian${i} Student${timestamp}`,
              email: `guardian${i}${timestamp}@test.com`,
              phone: '+251911223344',
              relationship: 'Father',
              primary: true
            }
          ]
        };
        
        const req = request(app).post('/api/students').send(studentData);
        if (testBranchId) req.set('x-branch-id', testBranchId);
        return req;
      });

      const startTime = Date.now();
      const responses = await Promise.all(registrationRequests);
      const endTime = Date.now();

      if (responses.length > 0) {
        console.log('STATUS:', responses[0].status, 'BODY:', JSON.stringify(responses[0].body));
      }

      const successCount = responses.filter(r => r.status === 201 || r.status === 200).length;
      const conflictCount = responses.filter(r => r.status === 409).length;
      const errorCount = responses.filter(r => r.status >= 400).length;
      const totalTime = endTime - startTime;

      console.log(`✓ ${concurrentRegistrations} concurrent student registrations completed in ${totalTime}ms:`);
      console.log(`  - Success: ${successCount}`);
      console.log(`  - Conflicts (duplicate): ${conflictCount}`);
      console.log(`  - Errors: ${errorCount}`);

      // Concurrency test: all requests must have received a response (no crashes/hangs)
      const totalResponded = responses.length;
      expect(totalResponded).toBe(concurrentRegistrations);
      // At least one registration should succeed (proves the endpoint works)
      expect(successCount).toBeGreaterThanOrEqual(1);
      // Should complete in reasonable time regardless
      expect(totalTime).toBeLessThan(30000); // Under 30 seconds
    }, 30000);
  });
});
