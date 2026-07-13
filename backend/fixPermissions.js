/**
 * fixPermissions.js
 * Resets all role permissions to match the correct defaults from the image:
 *   Admin   → manage_academic_year only
 *   Cashier → (none)
 *   Teacher → student_registration, manage_grades, manage_attendance
 *   Student → (none)
 *   Parent  → (none)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CORRECT_DEFAULTS = {
  Admin: ['manage_academic_year', 'generate_reports', 'manage_users'],
  Cashier: ['manage_fees', 'verify_payments'],
  Teacher: ['student_registration', 'manage_grades', 'manage_attendance'],
  Student: [],
  Parent: [],
};

async function main() {
  const roles = Object.keys(CORRECT_DEFAULTS);

  // Wipe all existing permissions for these roles, then re-insert the correct set
  for (const role of roles) {
    await prisma.rolePermission.deleteMany({ where: { role } });
    const perms = CORRECT_DEFAULTS[role];
    if (perms.length > 0) {
      await prisma.rolePermission.createMany({
        data: perms.map((permission) => ({ role, permission })),
      });
    }
    console.log(`✅ ${role}: set to [${perms.join(', ') || 'none'}]`);
  }
  console.log('\nDone — permissions match the default setup.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
