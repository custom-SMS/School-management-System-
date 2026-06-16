const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');

// @desc    Create a new physical classroom
// @route   POST /api/classrooms
// @access  Private (Admin/SuperAdmin)
const createClassroom = async (req, res) => {
  try {
    const { name, number, capacity, building, status } = req.body;

    if (!name || !number) {
      return res.status(400).json({ message: 'Classroom name and number are required.' });
    }

    // Check if classroom number already exists
    const existing = await prisma.classroom.findUnique({
      where: { number }
    });
    if (existing) {
      return res.status(400).json({ message: 'Classroom with this number already exists.' });
    }

    const classroom = await prisma.classroom.create({
      data: {
        name,
        number,
        capacity: capacity || null,
        building: building || null,
        status: status || 'Active'
      }
    });

    await logActivity(req.user._id, 'Create Classroom', classroom.id, `Created classroom: ${name} (${number})`);

    res.status(201).json(classroom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all physical classrooms
// @route   GET /api/classrooms
// @access  Private (Admin/SuperAdmin/Teacher)
const getClassrooms = async (req, res) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      include: {
        timetables: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json(classrooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a physical classroom
// @route   PUT /api/classrooms/:id
// @access  Private (Admin/SuperAdmin)
const updateClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, number, capacity, building, status } = req.body;

    const existingClassroom = await prisma.classroom.findUnique({
      where: { id }
    });
    if (!existingClassroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Check if new number conflicts with existing classroom
    if (number && number !== existingClassroom.number) {
      const existing = await prisma.classroom.findUnique({
        where: { number }
      });
      if (existing) {
        return res.status(400).json({ message: 'Classroom with this number already exists.' });
      }
    }

    const updatedClassroom = await prisma.classroom.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(number && { number }),
        ...(capacity !== undefined && { capacity }),
        ...(building !== undefined && { building }),
        ...(status && { status })
      }
    });

    await logActivity(req.user._id, 'Update Classroom', existingClassroom.id, `Updated classroom: ${existingClassroom.name}`);

    res.status(200).json(updatedClassroom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a physical classroom with integrity checks
// @route   DELETE /api/classrooms/:id
// @access  Private (Admin/SuperAdmin)
const deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params;

    const existingClassroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        timetables: { select: { id: true } }
      }
    });

    if (!existingClassroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Integrity check: cannot delete classroom with scheduled timetables
    if (existingClassroom.timetables.length > 0) {
      return res.status(400).json({ message: 'Cannot delete classroom with scheduled timetables. Please remove timetables first.' });
    }

    await prisma.classroom.delete({
      where: { id }
    });

    await logActivity(req.user._id, 'Delete Classroom', id, `Deleted classroom: ${existingClassroom.name}`);

    res.status(200).json({ message: 'Classroom deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createClassroom,
  getClassrooms,
  updateClassroom,
  deleteClassroom
};
