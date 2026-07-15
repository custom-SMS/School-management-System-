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

    // Get branchId from filter or use default
    const branchId = req.branchFilter?.branchId || process.env.DEFAULT_BRANCH_ID || null;

    // Check for duplicate subject name within the same branch
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
    res.status(500).json({ message: error.message });
  }
};

// Get all subjects
const getSubjects = async (req, res) => {
  try {
    const whereClause = req.branchFilter || {};
    const subjects = await prisma.subject.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });
    res.status(200).json(subjects);
  } catch (error) {
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

module.exports = {
  createSubject,
  getSubjects,
  deleteSubject
};
