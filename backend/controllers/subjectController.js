const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');

// Create a subject
const createSubject = async (req, res) => {
  try {
    const { name, department } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Subject name is required.' });
    }

    const existing = await prisma.subject.findUnique({
      where: { name }
    });
    if (existing) {
      return res.status(400).json({ message: 'Subject already exists.' });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        department
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
    const subjects = await prisma.subject.findMany({
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

    const subject = await prisma.subject.findUnique({
      where: { id }
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
