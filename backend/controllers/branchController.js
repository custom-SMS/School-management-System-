const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');

// ─── Schools ──────────────────────────────────────────────────────────────────

const getSchools = async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      include: { branches: { include: { levels: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(schools);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createSchool = async (req, res) => {
  try {
    const { name, code, address, phone, email } = req.body;
    if (!name || !code) return res.status(400).json({ message: 'name and code are required.' });

    const school = await prisma.school.create({
      data: { name, code: code.toUpperCase(), address, phone, email },
    });
    await logActivity(req.user._id, 'Create School', school.id, `Created school: ${name}`);
    res.status(201).json(school);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ message: 'School code already exists.' });
    res.status(500).json({ message: err.message });
  }
};

const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, phone, email, isActive } = req.body;
    const school = await prisma.school.update({
      where: { id },
      data: { name, code: code?.toUpperCase(), address, phone, email, isActive },
    });
    await logActivity(req.user._id, 'Update School', id, `Updated school: ${school.name}`);
    res.json(school);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await prisma.school.findUnique({
      where: { id },
      include: { branches: { include: { levels: true } } },
    });
    if (!school) return res.status(404).json({ message: 'School not found.' });

    // Collect all branch IDs and level IDs for cascade cleanup
    const branchIds = school.branches.map((b) => b.id);
    const levelIds = school.branches.flatMap((b) => b.levels.map((l) => l.id));

    await prisma.$transaction(async (tx) => {
      // Delete levels first
      if (levelIds.length > 0) {
        await tx.educationalLevel.deleteMany({ where: { id: { in: levelIds } } });
      }
      // Delete branches
      if (branchIds.length > 0) {
        await tx.branch.deleteMany({ where: { id: { in: branchIds } } });
      }
      // Delete the school
      await tx.school.delete({ where: { id } });
    });

    await logActivity(req.user._id, 'Delete School', id, `Deleted school: ${school.name}`);
    res.json({ message: 'School deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: { levels: true },
    });
    if (!branch) return res.status(404).json({ message: 'Branch not found.' });

    const levelIds = branch.levels.map((l) => l.id);

    await prisma.$transaction(async (tx) => {
      // Delete levels first
      if (levelIds.length > 0) {
        await tx.educationalLevel.deleteMany({ where: { id: { in: levelIds } } });
      }
      // Delete the branch
      await tx.branch.delete({ where: { id } });
    });

    await logActivity(req.user._id, 'Delete Branch', id, `Deleted branch: ${branch.name}`);
    res.json({ message: 'Branch deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ─── Branches ─────────────────────────────────────────────────────────────────

const getBranches = async (req, res) => {
  try {
    const { schoolId } = req.query;
    const where = schoolId ? { schoolId } : {};
    const branches = await prisma.branch.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        levels: { orderBy: { order: 'asc' } },
        _count: { select: { students: true, teachers: true, classes: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(branches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        school: true,
        levels: { orderBy: { order: 'asc' } },
        userScopes: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
        _count: { select: { students: true, teachers: true, classes: true } },
      },
    });
    if (!branch) return res.status(404).json({ message: 'Branch not found.' });
    res.json(branch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createBranch = async (req, res) => {
  try {
    const { schoolId, name, code, address, phone } = req.body;
    if (!schoolId || !name || !code) {
      return res.status(400).json({ message: 'schoolId, name and code are required.' });
    }
    const branch = await prisma.branch.create({
      data: { schoolId, name, code: code.toUpperCase(), address, phone },
    });
    await logActivity(req.user._id, 'Create Branch', branch.id, `Created branch: ${name}`);
    res.status(201).json(branch);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ message: 'Branch code already exists in this school.' });
    res.status(500).json({ message: err.message });
  }
};

const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, phone, isActive } = req.body;
    const branch = await prisma.branch.update({
      where: { id },
      data: { name, code: code?.toUpperCase(), address, phone, isActive },
    });
    await logActivity(req.user._id, 'Update Branch', id, `Updated branch: ${branch.name}`);
    res.json(branch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Educational Levels ───────────────────────────────────────────────────────

const getLevelsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const levels = await prisma.educationalLevel.findMany({
      where: { branchId },
      include: {
        _count: { select: { classes: true } },
        userScopes: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
      orderBy: { order: 'asc' },
    });
    res.json(levels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createLevel = async (req, res) => {
  try {
    const { branchId, name, order, gradeRange } = req.body;
    if (!branchId || !name) return res.status(400).json({ message: 'branchId and name are required.' });

    const level = await prisma.educationalLevel.create({
      data: { branchId, name, order: order ?? 0, gradeRange },
    });
    await logActivity(req.user._id, 'Create Level', level.id, `Created level: ${name} in branch ${branchId}`);
    res.status(201).json(level);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ message: 'Level name already exists in this branch.' });
    res.status(500).json({ message: err.message });
  }
};

const updateLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order, gradeRange, isActive } = req.body;
    const level = await prisma.educationalLevel.update({
      where: { id },
      data: { name, order, gradeRange, isActive },
    });
    await logActivity(req.user._id, 'Update Level', id, `Updated level: ${level.name}`);
    res.json(level);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const level = await prisma.educationalLevel.findUnique({
      where: { id },
      include: { _count: { select: { classes: true } } },
    });
    if (!level) return res.status(404).json({ message: 'Level not found.' });
    if (level._count.classes > 0) {
      return res.status(400).json({ message: 'Cannot delete a level that has classes assigned to it.' });
    }
    await prisma.educationalLevel.delete({ where: { id } });
    await logActivity(req.user._id, 'Delete Level', id, `Deleted level: ${level.name}`);
    res.json({ message: 'Level deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── UserScope management ─────────────────────────────────────────────────────

const getUserScopes = async (req, res) => {
  try {
    const { branchId, levelId } = req.query;
    const where = {};
    if (branchId) where.branchId = branchId;
    if (levelId)  where.levelId  = levelId;

    const scopes = await prisma.userScope.findMany({
      where,
      include: {
        user:   { select: { id: true, name: true, email: true, role: true, isActive: true } },
        branch: { select: { id: true, name: true } },
        level:  { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(scopes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const assignUserScope = async (req, res) => {
  try {
    const { userId, scopeType, schoolId, branchId, levelId } = req.body;
    if (!userId || !scopeType) return res.status(400).json({ message: 'userId and scopeType are required.' });

    const validScopes = ['SchoolAdmin', 'BranchAdmin', 'LevelAdmin', 'Cashier'];
    if (!validScopes.includes(scopeType)) {
      return res.status(400).json({ message: `Invalid scopeType. Must be one of: ${validScopes.join(', ')}` });
    }

    // Check if user already has any scope assignment
    const existingUserScope = await prisma.userScope.findFirst({
      where: { userId }
    });

    if (existingUserScope) {
      return res.status(400).json({ 
        message: 'User already has a scope assignment. A user can only be assigned to one role.' 
      });
    }

    const scope = await prisma.userScope.create({
      data: { userId, scopeType, schoolId, branchId, levelId },
    });

    // Ensure the user's role is set to Admin if assigning an admin scope
    if (['SchoolAdmin', 'BranchAdmin', 'LevelAdmin'].includes(scopeType)) {
      await prisma.user.update({ where: { id: userId }, data: { role: 'Admin' } });
    }
    if (scopeType === 'Cashier') {
      await prisma.user.update({ where: { id: userId }, data: { role: 'Cashier' } });
    }

    await logActivity(req.user._id, 'Assign User Scope', userId,
      `Assigned ${scopeType} to user ${userId} (branch: ${branchId}, level: ${levelId})`);
    res.status(201).json(scope);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeUserScope = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.userScope.delete({ where: { id } });
    await logActivity(req.user._id, 'Remove User Scope', id, `Removed user scope ${id}`);
    res.json({ message: 'Scope removed.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getSchools, createSchool, updateSchool,
  getBranches, getBranchById, createBranch, updateBranch,
  getLevelsByBranch, createLevel, updateLevel, deleteLevel,
  getUserScopes, assignUserScope, removeUserScope,deleteBranch,deleteSchool
};
