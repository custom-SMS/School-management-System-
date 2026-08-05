const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');

// Create a subject
const createSubject = async (req, res) => {
  try {
    const { name, department, gradesOffered = [], branchId: bodyBranchId } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Subject name is required.' });
    }

    const normalizedGrades = Array.isArray(gradesOffered)
      ? [...new Set(gradesOffered.map((grade) => String(grade).trim()).filter(Boolean))]
      : [];

    // Get branchId from body, filter, header, or user scope
    let branchId = bodyBranchId || req.branchFilter?.branchId || req.headers['x-branch-id'] || req.user?.branchId || null;

    if (!branchId && req.user?.id) {
      const userScope = await prisma.userScope.findFirst({
        where: { userId: req.user.id, branchId: { not: null } }
      });
      if (userScope?.branchId) {
        branchId = userScope.branchId;
      }
    }

    // Fallback: If no branchId is resolved, use default active branch
    if (!branchId) {
      const defaultBranch = await prisma.branch.findFirst({ where: { isActive: true } });
      if (defaultBranch) {
        branchId = defaultBranch.id;
      }
    }

    if (!branchId) {
      return res.status(400).json({ message: 'A valid branch is required to create a subject.' });
    }

    // Validate that the branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });
    if (!branch) {
      return res.status(404).json({ message: 'Specified branch not found.' });
    }

    // Check for duplicate subject name within the same branch
    const existing = await prisma.subject.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        branchId
      }
    });
    if (existing) {
      return res.status(400).json({ message: 'Subject already exists in this branch.' });
    }

    // Check if subject already exists for any of the selected grades within the same branch
    if (normalizedGrades.length > 0) {
      const allSubjects = await prisma.subject.findMany({
        where: { branchId }
      });
      for (const grade of normalizedGrades) {
        const duplicateForGrade = allSubjects.find(s =>
          s.name.toLowerCase() === name.toLowerCase() &&
          (s.gradesOffered || []).includes(grade)
        );
        if (duplicateForGrade) {
          return res.status(400).json({
            message: `Subject "${name}" is already assigned to ${grade} in this branch. Please select a different subject or grade.`
          });
        }
      }
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        department,
        gradesOffered: normalizedGrades,
        branchId
      }
    });

    await logActivity(req.user._id, 'Create Subject', subject.id, `Created subject: ${name}`);

    res.status(201).json(subject);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all subjects
const getSubjects = async (req, res) => {
  try {
    const { branchId: queryBranchId, page, limit, search } = req.query;
    let branchFilter = req.branchFilter || {};

    if (queryBranchId) {
      branchFilter = { branchId: queryBranchId };
    }

    const baseWhere = Object.keys(branchFilter).length > 0
      ? {
          OR: [
            branchFilter,
            { branchId: null }
          ]
        }
      : {};

    let whereClause = baseWhere;

    if (search && search.trim()) {
      const searchTerms = search.trim();
      const searchCondition = {
        OR: [
          { name: { contains: searchTerms, mode: 'insensitive' } },
          { department: { contains: searchTerms, mode: 'insensitive' } }
        ]
      };
      if (Object.keys(baseWhere).length > 0) {
        whereClause = {
          AND: [
            baseWhere,
            searchCondition
          ]
        };
      } else {
        whereClause = searchCondition;
      }
    }

    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 10);
      const skip = (pageNum - 1) * limitNum;

      const [subjects, total] = await Promise.all([
        prisma.subject.findMany({
          where: whereClause,
          include: {
            branch: { select: { id: true, name: true, code: true } }
          },
          orderBy: { name: 'asc' },
          skip,
          take: limitNum
        }),
        prisma.subject.count({ where: whereClause })
      ]);

      return res.status(200).json({
        subjects,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        limit: limitNum
      });
    }

    const subjects = await prisma.subject.findMany({
      where: whereClause,
      include: {
        branch: { select: { id: true, name: true, code: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a subject
const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const branchFilter = req.branchFilter || {};
    const whereClause = Object.keys(branchFilter).length > 0
      ? {
          id,
          OR: [
            branchFilter,
            { branchId: null }
          ]
        }
      : { id };

    const subject = await prisma.subject.findFirst({
      where: whereClause
    });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    await prisma.subject.delete({
      where: { id }
    });

    await logActivity(req.user._id, 'Delete Subject', id, `Deleted subject: ${subject.name}`);

    res.status(200).json({ message: 'Subject deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a subject
const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, gradesOffered = [], branchId: bodyBranchId } = req.body;

    const branchFilter = req.branchFilter || {};
    const whereClause = Object.keys(branchFilter).length > 0
      ? {
          id,
          OR: [
            branchFilter,
            { branchId: null }
          ]
        }
      : { id };

    const subject = await prisma.subject.findFirst({
      where: whereClause
    });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const normalizedGrades = Array.isArray(gradesOffered)
      ? [...new Set(gradesOffered.map((grade) => String(grade).trim()).filter(Boolean))]
      : [];

    // Check for duplicate subject name within the same branch (excluding current subject)
    if (name && name !== subject.name) {
      const existing = await prisma.subject.findFirst({
        where: {
          name,
          branchId: bodyBranchId !== undefined ? bodyBranchId : subject.branchId,
          id: { not: id }
        }
      });
      if (existing) {
        return res.status(400).json({ message: 'Subject already exists in this branch.' });
      }
    }

    // Check if subject already exists for any of the selected grades within the same branch
    if (normalizedGrades.length > 0) {
      const targetBranchId = bodyBranchId !== undefined ? bodyBranchId : subject.branchId;
      const allSubjects = await prisma.subject.findMany({
        where: { branchId: targetBranchId, id: { not: id } }
      });
      for (const grade of normalizedGrades) {
        const duplicateForGrade = allSubjects.find(s =>
          s.name.toLowerCase() === (name || subject.name).toLowerCase() &&
          (s.gradesOffered || []).includes(grade)
        );
        if (duplicateForGrade) {
          return res.status(400).json({
            message: `Subject "${name || subject.name}" is already assigned to ${grade} in this branch. Please select a different subject or grade.`
          });
        }
      }
    }

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: {
        name: name !== undefined ? name : subject.name,
        department: department !== undefined ? department : subject.department,
        gradesOffered: gradesOffered !== undefined ? normalizedGrades : subject.gradesOffered,
        branchId: bodyBranchId !== undefined ? bodyBranchId : subject.branchId
      }
    });

    await logActivity(req.user._id, 'Update Subject', id, `Updated subject: ${updatedSubject.name}`);

    res.status(200).json(updatedSubject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject
};
