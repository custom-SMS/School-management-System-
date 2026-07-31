const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendTeacherCredentialsEmail } = require('../utils/emailService');

const generatePassword = () => crypto.randomBytes(4).toString('hex');

const generateTeacherId = async (tx = prisma) => {
  const last = await tx.teacher.findFirst({
    where: { teacherId: { startsWith: 'TCH-' } },
    orderBy: { teacherId: 'desc' },
    select: { teacherId: true },
  });
  const lastNum = last ? parseInt(last.teacherId.replace('TCH-', ''), 10) : 0;
  const nextNum = Number.isNaN(lastNum) ? 1 : lastNum + 1;
  return `TCH-${nextNum.toString().padStart(4, '0')}`;
};

const getEmployees = async (req, res) => {
  try {
    const isPaginated = req.query.paginate === 'true' || req.query.page !== undefined || req.query.limit !== undefined;

    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.max(1, parseInt(req.query.limit, 10) || 15);
    const search = req.query.search?.trim();
    const filterRole = req.query.role?.trim();
    const branchId = req.query.branchId?.trim();

    const baseWhere = {
      role: filterRole ? filterRole : { in: ['Teacher', 'Admin', 'Cashier'] }
    };

    const whereConditions = [baseWhere];

    if (search) {
      whereConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    if (branchId) {
      whereConditions.push({
        OR: [
          { teacherProfile: { branchId } },
          { userScope: { some: { branchId } } }
        ]
      });
    }

    const where = whereConditions.length > 1 ? { AND: whereConditions } : baseWhere;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          teacherProfile: {
            include: { branch: true }
          },
          userScope: {
            include: { branch: true }
          }
        },
        skip: isPaginated ? (pageNum - 1) * limitNum : undefined,
        take: isPaginated ? limitNum : undefined,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const formattedEmployees = users.map(u => {
      let department = '';
      let branch = null;
      let bId = null;

      if (u.role === 'Teacher' && u.teacherProfile) {
        department = u.teacherProfile.department || u.teacherProfile.subject;
        bId = u.teacherProfile.branchId;
        branch = u.teacherProfile.branch;
      } else if (u.userScope && u.userScope.length > 0) {
        bId = u.userScope[0].branchId;
        branch = u.userScope[0].branch;
      }

      return {
        ...u,
        _id: u.id, // For frontend compatibility
        department,
        branchId: bId,
        branchName: branch?.name || null
      };
    });

    if (isPaginated) {
      return res.json({
        employees: formattedEmployees,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      });
    }

    res.json(formattedEmployees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const registerEmployee = async (req, res) => {
  try {
    const { name, email, password, role, subject, qualification, department, branchId } = req.body;

    if (!name || !role) {
      return res.status(400).json({ message: 'Name and role are required' });
    }

    if (email) {
      const existingUser = await prisma.user.findFirst({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const plainPassword = password || generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    let employeeData = null;
    let generatedSystemId = email || name; 

    if (role === 'Teacher') {
      const MAX_ATTEMPTS = 5;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          employeeData = await prisma.$transaction(async (tx) => {
            const teacherId = await generateTeacherId(tx);
            generatedSystemId = teacherId;
            
            const user = await tx.user.create({
              data: {
                name,
                email: email || null,
                password: hashedPassword,
                role: 'Teacher',
              }
            });

            return tx.teacher.create({
              data: {
                userId: user.id,
                teacherId,
                subject: subject || 'General',
                qualification: qualification || 'Degree',
                department: department || 'General',
                branchId: branchId || null,
              },
              include: { user: true }
            });
          }, { maxWait: 10000, timeout: 20000 });
          break;
        } catch (err) {
          if (err.code === 'P2002' && err.meta?.target?.includes?.('teacherId') && attempt < MAX_ATTEMPTS) {
            continue;
          }
          throw err;
        }
      }
    } else if (['Admin', 'Cashier'].includes(role)) {
      employeeData = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email: email || null,
            password: hashedPassword,
            role,
          }
        });
        
        let scopeType = role === 'Cashier' ? 'Cashier' : 'BranchAdmin';
        
        const scope = await tx.userScope.create({
          data: {
            userId: user.id,
            scopeType,
            branchId: branchId || null,
          }
        });
        
        return { user, userScope: [scope] };
      });
    } else {
      return res.status(400).json({ message: 'Invalid role for employee' });
    }

    // Email logic: fire in background so HTTP response returns instantly without waiting for SMTP server
    if (email) {
      sendTeacherCredentialsEmail(email, name, generatedSystemId, plainPassword)
        .then((result) => {
          console.log(`[employeeController] Credentials email sent to ${email}, id: ${result?.id || 'n/a'}`);
        })
        .catch((e) => {
          console.error('[employeeController] Failed to send credentials email:', e?.message || e);
        });
    }

    res.status(201).json({
      message: `${role} registered successfully`,
      employee: employeeData,
      credentials: {
        systemId: generatedSystemId,
        password: plainPassword,
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, subject, qualification, department, branchId } = req.body;
    
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { teacherProfile: true, userScope: true }
    });
    
    if (!existingUser) return res.status(404).json({ message: 'Employee not found' });
    
    if (email) {
      const duplicateUser = await prisma.user.findFirst({
        where: { email, NOT: { id } }
      });
      if (duplicateUser) return res.status(400).json({ message: 'Email already exists' });
    }
    
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update User basic info
      const u = await tx.user.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email: email || null } : {}),
        }
      });
      
      // 2. Update Role-specific profile
      if (existingUser.role === 'Teacher') {
        await tx.teacher.update({
          where: { userId: id },
          data: {
            ...(subject !== undefined ? { subject } : {}),
            ...(qualification !== undefined ? { qualification } : {}),
            ...(department !== undefined ? { department } : {}),
            ...(branchId !== undefined ? { branchId: branchId || null } : {})
          }
        });
      } else if (['Admin', 'Cashier'].includes(existingUser.role)) {
        if (existingUser.userScope && existingUser.userScope.length > 0) {
          await tx.userScope.update({
            where: { id: existingUser.userScope[0].id },
            data: { ...(branchId !== undefined ? { branchId: branchId || null } : {}) }
          });
        } else if (branchId) {
          let scopeType = existingUser.role === 'Cashier' ? 'Cashier' : 'BranchAdmin';
          await tx.userScope.create({
             data: { userId: id, scopeType, branchId: branchId || null }
          });
        }
      }
      return u;
    });
    
    res.json({ message: 'Employee updated', employee: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id }, include: { teacherProfile: true } });
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    
    await prisma.$transaction(async (tx) => {
      if (user.teacherProfile) {
        await tx.class.updateMany({ where: { teacherId: user.teacherProfile.id }, data: { teacherId: null } });
        await tx.teacherAssignment.deleteMany({ where: { teacherId: user.teacherProfile.id } });
      }
      // Deleting user cascades to Teacher and UserScope
      await tx.user.delete({ where: { id } });
    });
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getEmployees, registerEmployee, updateEmployee, deleteEmployee };
