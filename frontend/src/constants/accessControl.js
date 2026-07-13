// Single source of truth for the access-control console (Roles & Permissions pages).
// Roles are fixed by the backend Prisma `Role` enum and cannot be created/deleted.
// SuperAdmin implicitly holds every permission (the backend returns ["*"] for it),
// so it is always shown as fully granted and is not editable here.

export const ROLES = ['SuperAdmin', 'Admin', 'Cashier', 'Teacher', 'Student', 'Parent'];

// Roles whose permission set is managed through this console. SuperAdmin is excluded
// because it bypasses all permission checks server-side.
export const EDITABLE_ROLES = ['Admin', 'Cashier', 'Teacher', 'Student', 'Parent'];

export const ROLE_META = {
  SuperAdmin: { description: 'Full unrestricted system access', accent: 'bg-violet-600' },
  Admin: { description: 'School administration and academic operations', accent: 'bg-blue-600' },
  Cashier: { description: 'Finance, fees and payment management', accent: 'bg-emerald-600' },
  Teacher: { description: 'Classroom, grade and attendance management', accent: 'bg-indigo-600' },
  Student: { description: 'Student portal access', accent: 'bg-amber-500' },
  Parent: { description: 'Parent portal access', accent: 'bg-rose-500' },
};

// The catalog of assignable permissions. The `key` is the exact string stored in the
// RolePermission table and checked by the backend `checkPermission` middleware and the
// frontend ProtectedRoute `requiredPermission` prop.
export const PERMISSION_CATALOG = [
  { key: 'student_registration', label: 'Student Registration', description: 'Register, edit and manage student records', category: 'Academic' },
  { key: 'manage_academic_year', label: 'Academic Year Management', description: 'Create academic years and open/close registration periods', category: 'Academic' },
  { key: 'manage_grades', label: 'Grade Management', description: 'Enter and edit student grades', category: 'Academic' },
  { key: 'manage_attendance', label: 'Attendance Management', description: 'Record and amend student attendance', category: 'Academic' },
  { key: 'manage_timetable', label: 'Timetable Management', description: 'Create and edit class timetables', category: 'Academic' },
  { key: 'manage_fees', label: 'Fee Management', description: 'Create and manage fees and invoices', category: 'Finance' },
  { key: 'verify_payments', label: 'Payment Verification', description: 'Verify bank payments and issue receipts', category: 'Finance' },
  { key: 'generate_reports', label: 'Report Generation', description: 'Generate report cards and analytics', category: 'Reporting' },
  { key: 'manage_users', label: 'User Management', description: 'Manage user accounts, roles and passwords', category: 'System' },
  { key: 'view_audit_logs', label: 'Audit Log Access', description: 'View the system-wide audit trail', category: 'System' },
  { key: 'manage_settings', label: 'System Settings', description: 'Configure institutional system settings', category: 'System' },
];

export const PERMISSION_CATEGORIES = ['Academic', 'Finance', 'Reporting', 'System'];

// Default permissions applied when a role has no saved permissions in the database yet.
export const DEFAULT_PERMISSIONS = {
  Admin: [
    'manage_academic_year',
    'generate_reports',
    'manage_users',
  ],
  Cashier: [
    'manage_fees',
    'verify_payments',
  ],
  Teacher: [
    'student_registration',
    'manage_grades',
    'manage_attendance',
  ],
  Student: [],
  Parent: [],
};
