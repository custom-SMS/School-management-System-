# UAT Database Seeding

This directory contains seed scripts for populating the UAT database with realistic test data.

## Structure

```
seeds/uat/
├── index.js                    # Main entry point
├── 01_cleanup.js               # Clean existing data
├── 02_school_structure.js      # Schools, branches, levels
├── 03_users.js                 # All user accounts
├── 04_academic_setup.js        # Academic years, semesters
├── 05_classes_sections.js      # Classes, sections, subjects
├── 06_enrollments.js           # Student enrollments
├── 07_teachers_assignments.js   # Teacher assignments
├── 08_grading_setup.js         # Grading structures
├── 09_attendance_data.js       # Attendance records
├── 10_grades_data.js           # Grade entries
├── 11_fees_payments.js         # Fees and payments
├── 12_report_cards.js          # Report card data
├── 13_notifications.js         # Sample notifications
├── 14_timetable.js             # Sample timetables
└── README.md                   # This file
```

## Usage

### Seed the database

```bash
npm run seed:uat
```

### Reset the database

```bash
# Reset with backup
npm run reset:uat

# Force backup
npm run reset:uat:backup

# Reset without backup
npm run reset:uat:no-backup
```

## Data Created

### School Structure
- 1 School
- 3 Branches (Main, North, South)
- 9 Educational Levels (3 per branch)

### Users
- 1 Super Admin
- 3 Branch Admins
- 12 Teachers (4 per branch)
- 3 Cashiers (1 per branch)
- 60 Students (20 per branch)
- 30 Parents (each linked to 2 students)

### Academic Setup
- 2 Academic Years
- 4 Semesters (2 per year)

### Classes & Sections
- 30 Classes (10 per branch)
- 60 Sections (2 per class)
- 24 Subjects (8 per level)

### Test Data
- 30 days of attendance records
- 240+ grade entries
- 600+ fee records
- 420+ payment records
- 20+ report cards
- 60+ notifications
- 350+ timetable entries

## Test Accounts

All test accounts use the password: `Test@1234`

### Super Admin
- Email: superadmin@school.test

### Branch Admins
- admin.branch1@school.test
- admin.branch2@school.test
- admin.branch3@school.test

### Teachers
- teacher.math1@school.test (Math, Branch 1)
- teacher.science1@school.test (Science, Branch 1)
- teacher.english1@school.test (English, Branch 1)
- teacher.history1@school.test (History, Branch 1)
- (Similar pattern for branches 2 and 3)

### Cashiers
- cashier.branch1@school.test
- cashier.branch2@school.test
- cashier.branch3@school.test

### Students
- Format: student.{grade}.{number}@school.test
- Examples: student.grade1.01@school.test, student.grade5.10@school.test

### Parents
- Format: parent.{number}@school.test
- Examples: parent.01@school.test, parent.02@school.test

## Adding New Seed Scripts

1. Create a new file in the `seeds/uat/` directory
2. Name it with a number prefix (e.g., `15_new_feature.js`)
3. Export a `seed` function and `name` property:

```javascript
async function seed(prisma, bcrypt) {
  console.log('  📝 Creating new feature data...');
  // Your seeding logic here
  console.log('  ✅ Completed');
}

module.exports = { name: '15_new_feature', seed };
```

4. Add it to the `seedScripts` array in `index.js`

## Troubleshooting

### Database connection errors
- Ensure your `.env` file has the correct `DATABASE_URL`
- Verify the database server is running
- Check database permissions

### Seed script errors
- Check the console output for specific error messages
- Ensure Prisma client is generated: `npm run generate`
- Verify database schema is up to date: `npx prisma db push`

### Redis errors
- Redis is optional for seeding
- If Redis is not configured, seeding will still work
- Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env`
