const express = require('express');
const path = require('path');
const prisma = require('./prisma');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed frontend origins (must be explicit when credentials are enabled — '*' is not allowed)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true, // allow the browser to send/receive the auth cookie
}));
app.use(express.json());
app.use(cookieParser());

// Connect to PostgreSQL database via Prisma
prisma.$connect()
  .then(() => console.log('PostgreSQL database connected via Prisma'))
  .catch(err => {
    console.error('Prisma connection error:', err);
    process.exit(1); // Exit if DB connection fails to make sure server doesn't run in bad state
  });

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/fees', require('./routes/feeRoutes'));
app.use('/api/classroom', require('./routes/classroomRoutes'));
app.use('/api/classrooms', require('./routes/physicalClassroomRoutes'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/teachers', require('./routes/teacherRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/academic-years', require('./routes/academicYearRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/timetables', require('./routes/timetableRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/report-cards', require('./routes/reportCardRoutes'));
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));
app.use('/api/uploads', require('./routes/uploadRoutes'));

// Serve uploaded documents statically.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('School Management System API');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
