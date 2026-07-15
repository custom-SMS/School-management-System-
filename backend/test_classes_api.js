const prisma = require('./prisma');
const { resolveClassHomeroomTeacherId } = require('./utils/homeroomGuard');

async function test() {
  try {
    const classes = await prisma.class.findMany({
      include: {
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        sections: {
          include: {
            homeroomTeacher: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log('Found', classes.length, 'classes');

    const responseClasses = await Promise.all(classes.map(async (klass) => {
      console.log('Processing class:', klass.id, klass.name);
      const resolvedTeacherId = await resolveClassHomeroomTeacherId(prisma, klass.id, { fallbackToClass: false });
      console.log('Resolved teacher ID:', resolvedTeacherId);
      const resolvedTeacher = resolvedTeacherId
        ? await prisma.teacher.findUnique({
          where: { id: resolvedTeacherId },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        })
        : null;

      return {
        ...klass,
        _id: klass.id,
        homeroomTeacher: resolvedTeacher
      };
    }));

    console.log('SUCCESS: Processed', responseClasses.length, 'classes');
  } catch (err) {
    console.error('FAILED:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

test();
