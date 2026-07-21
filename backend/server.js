const express = require('express');
const path = require('path');
const prisma = require('./prisma');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('dotenv').config();

//const { globalCacheMiddleware } = require('./middleware/globalCacheMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed frontend origins (must be explicit when credentials are enabled — '*' is not allowed)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:4173')
  .split(',')
  .map((origin) => origin.trim());

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});


// Connect to PostgreSQL database via Prisma
prisma.$connect()
  .then(() => console.log('PostgreSQL database connected via Prisma'))
  .catch(err => {
    console.error('Prisma connection error:', err);
    process.exit(1); // Exit if DB connection fails to make sure server doesn't run in bad state
  });

// Global Redis cache for GET JSON responses (branch + role based)
// Must run after auth/branch middleware for the route to populate req.user + req.branchFilter.
// Route handlers will also attach a cache resource version (req.cacheResourceVersion).
//app.use(globalCacheMiddleware);

// Routes

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/fees', require('./routes/feeRoutes'));
app.use('/api/classroom', require('./routes/classroomRoutes'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/teachers', require('./routes/teacherRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/academic-years', require('./routes/academicYearRoutes'));
app.use('/api/semesters', require('./routes/semesterRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/timetables', require('./routes/timetableRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/report-cards', require('./routes/reportCardRoutes'));
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));
app.use('/api/uploads', require('./routes/uploadRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/email', require('./routes/email'));
app.use('/api/settings', require('./routes/settingsRoutes'));


// Serve uploaded documents statically.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('School Management System API');
});

// Global error handler — must be last middleware.
// Catches any unhandled errors from route handlers and prevents raw Prisma errors
// (which contain DB hostnames, file paths, stack traces) from reaching the client.
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err?.message || err);
  const isDbDown = err?.message?.includes("Can't reach database") || err?.code === 'P1001';
  if (isDbDown) {
    return res.status(503).json({ message: 'Service temporarily unavailable. Please try again shortly.' });
  }
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
