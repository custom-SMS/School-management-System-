const { z } = require('zod');

// Common validation schemas
const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email is too long')
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long');

const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name is too long')
  .trim();

const phoneSchema = z
  .string()
  .optional()
  .refine((val) => !val || /^\+2519\d{8}$/.test(val), {
    message: 'Invalid phone number format. Expected +2519XXXXXXXX',
  });

const roleSchema = z.enum(['SuperAdmin', 'Admin', 'Cashier', 'Teacher', 'Student', 'Parent']);

const studentIdSchema = z
  .string()
  .min(3, 'Student ID must be at least 3 characters')
  .max(50, 'Student ID is too long')
  .trim();

const teacherIdSchema = z
  .string()
  .min(3, 'Teacher ID must be at least 3 characters')
  .max(50, 'Teacher ID is too long')
  .trim();

const parentIdSchema = z
  .string()
  .min(3, 'Parent ID must be at least 3 characters')
  .max(50, 'Parent ID is too long')
  .trim();

const gradeSchema = z
  .string()
  .min(1, 'Grade is required')
  .max(50, 'Grade is too long')
  .trim();

const subjectSchema = z
  .string()
  .min(2, 'Subject must be at least 2 characters')
  .max(100, 'Subject is too long')
  .trim();

// Auth schemas
const loginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  studentId: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine((data) => data.identifier || data.email || data.studentId, {
  message: 'Email, student ID, or identifier is required',
  path: ['identifier'],
});

const registerAdminSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema.optional(),
});

// Teacher schemas
const registerTeacherSchema = z.object({
  name: nameSchema,
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  subject: subjectSchema,
});

const updateTeacherSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  subject: subjectSchema.optional(),
});

// Student schemas
const createStudentSchema = z.object({
  name: nameSchema,
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  studentId: studentIdSchema.optional(),
  grade: gradeSchema.optional(),
  classId: z.string().uuid().optional(),
  stream: z.string().max(50).optional(),
  branchId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  personalDetails: z.any().optional(),
  familyBackground: z.any().optional(),
  guardianContacts: z.any().optional(),
});

const updateStudentSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  grade: gradeSchema.optional(),
  stream: z.string().max(50).optional(),
  branchId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  personalDetails: z.any().optional(),
  familyBackground: z.any().optional(),
  guardianContacts: z.any().optional(),
});

// Parent schemas
const createParentSchema = z.object({
  fullName: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema,
  relationship: z.string().max(50).default('Parent'),
  address: z.string().max(255).optional(),
  userId: z.string().uuid().optional(),
});

// Class schemas
const createClassSchema = z.object({
  name: z.string().min(1, 'Class name is required').max(50),
  teacherId: z.string().uuid().optional(),
  schedule: z.string().max(255).optional(),
  stream: z.string().max(50).optional(),
  subject: z.string().max(100).optional(),
});

const updateClassSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  teacherId: z.string().uuid().optional(),
  schedule: z.string().max(255).optional(),
  stream: z.string().max(50).optional(),
  subject: z.string().max(100).optional(),
});

// Grade schemas
const saveGradesSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  subject: subjectSchema,
  teacherId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  submitToHomeroom: z.boolean().optional(),
  gradesData: z.array(z.object({
    student: z.string().uuid('Invalid student ID'),
    // Accept any component name -> score mapping (dynamic grading components)
    marks: z.record(z.string(), z.number().min(0).max(100).nullable()).optional(),
  })).min(1, 'At least one grade is required'),
});

// Attendance schemas
const recordAttendanceSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  date: z.string().or(z.date()).optional(),
  records: z.array(z.object({
    student: z.string().uuid('Invalid student ID'),
    status: z.enum(['Present', 'Absent', 'Late', 'Excused']),
  })).min(1, 'At least one attendance record is required'),
  teacherId: z.string().uuid().optional(),
});

// Fee schemas
const createFeeSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1).max(255),
  month: z.string().min(1).max(50),
  dueDate: z.string().or(z.date()),
  academicYearId: z.string().uuid().optional(),
});

// Helper function to validate request body
const validateBody = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    return res.status(400).json({ message: 'Validation error' });
  }
};

// Helper function to validate query params
const validateQuery = (schema) => (req, res, next) => {
  try {
    schema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    return res.status(400).json({ message: 'Validation error' });
  }
};

// Helper function to validate params
const validateParams = (schema) => (req, res, next) => {
  try {
    schema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    return res.status(400).json({ message: 'Validation error' });
  }
};

module.exports = {
  // Schemas
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
  roleSchema,
  studentIdSchema,
  teacherIdSchema,
  parentIdSchema,
  gradeSchema,
  subjectSchema,
  loginSchema,
  registerAdminSchema,
  registerTeacherSchema,
  updateTeacherSchema,
  createStudentSchema,
  updateStudentSchema,
  createParentSchema,
  createClassSchema,
  updateClassSchema,
  saveGradesSchema,
  recordAttendanceSchema,
  createFeeSchema,
  // Middleware
  validateBody,
  validateQuery,
  validateParams,
};
