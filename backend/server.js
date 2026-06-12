const express = require('express');
const prisma = require('./prisma');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/teachers', require('./routes/teacherRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));

app.get('/', (req, res) => {
  res.send('School Management System API');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});