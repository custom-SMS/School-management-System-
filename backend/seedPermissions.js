/**
 * seedPermissions.js
 * Run with: node seedPermissions.js
 *
 * Restores the default role permissions to the database using upsert
 * (safe to re-run — will not remove any extra permissions you have manually set).
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS = {
  Admin: ['manage_academic_year', 'generate_reports', 'manage_users'],
  Cashier: ['manage_fees', 'verify_payments'],
  Teacher: ['student_registration', 'manage_grades', 'manage_attendance'],
  Student: [],
  Parent: [],
};

async function main() {
  let total = 0;
  for (const [role, perms] of Object.entries(DEFAULT_PERMISSIONS)) {
    for (const permission of perms) {
      await prisma.rolePermission.upsert({
        where: { role_permission: { role, permission } },
        update: {},
        create: { role, permission },
      });
      total++;
    }
    console.log(`✅ ${role}: ${perms.length} permission(s) seeded`);
  }
  console.log(`\nDone — ${total} default permission(s) ensured in database.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
