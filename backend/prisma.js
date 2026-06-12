const { PrismaClient } = require('@prisma/client');
const prismaRaw = new PrismaClient();

const prisma = prismaRaw.$extends({
  result: {
    grade: {
      total: {
        needs: { test: true, midterm: true, final: true },
        compute(grade) {
          return (grade.test || 0) + (grade.midterm || 0) + (grade.final || 0);
        },
      },
      percentage: {
        needs: { test: true, midterm: true, final: true, maxTotal: true },
        compute(grade) {
          const totalMarks = (grade.test || 0) + (grade.midterm || 0) + (grade.final || 0);
          return grade.maxTotal > 0 ? Number(((totalMarks / grade.maxTotal) * 100).toFixed(2)) : 0;
        },
      },
    },
  },
});

module.exports = prisma;
