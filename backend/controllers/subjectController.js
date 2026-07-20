const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');

// Create a subject
const createSubject = async (req, res) => {
  try {
    const { name, department, gradesOffered = [] } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Subject name is required.' });
    }

    const normalizedGrades = Array.isArray(gradesOffered)
      ? [...new Set(gradesOffered.map((grade) => String(grade).trim()).filter(Boolean))]
      : [];

    // Get branchId from filter (can be null for SuperAdmin creating global subjects)
    let branchId = req.branchFilter?.branchId || null;

    // If branchId is provided, validate that the branch exists
    // If branch doesn't exist, set branchId to null and proceed (for global subjects)
    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });
      if (!branch) {
        console.warn('Branch not found, creating subject without branch association:', branchId);
        branchId = null; // Set to null to proceed without branch association
      }
    }

    // Check for duplicate subject name within the same branch (or globally if no branch)
    const existing = await prisma.subject.findFirst({
      where: {
        name,
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
    const branchFilter = req.branchFilter || {};
    console.log('Fetching subjects with filter:', branchFilter);

    // Get subjects for the branch AND subjects without branch association (global subjects)
    const subjects = await prisma.subject.findMany({
      where: {
        OR: [
          branchFilter,
          { branchId: null }
        ]
      },
      orderBy: { name: 'asc' }
    });
    console.log('Found subjects:', subjects.length);
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

    const whereClause = { id, ...(req.branchFilter || {}) };
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
    const { name, department, gradesOffered = [] } = req.body;

    const whereClause = { id, ...(req.branchFilter || {}) };
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
          branchId: subject.branchId,
          id: { not: id }
        }
      });
      if (existing) {
        return res.status(400).json({ message: 'Subject already exists in this branch.' });
      }
    }

    // Check if subject already exists for any of the selected grades within the same branch
    if (normalizedGrades.length > 0) {
      const allSubjects = await prisma.subject.findMany({
        where: { branchId: subject.branchId, id: { not: id } }
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
        gradesOffered: gradesOffered !== undefined ? normalizedGrades : subject.gradesOffered
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
