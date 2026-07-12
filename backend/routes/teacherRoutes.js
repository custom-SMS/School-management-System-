const express = require('express');
const router = express.Router();
const { verifyToken, checkRole, checkPermission, injectBranchFilter } = require('../middleware/authMiddleware');
const { registerTeacher, getTeachers, updateTeacher, deleteTeacher } = require('../controllers/teacherController');

/**
 * @swagger
 * tags:
 *   name: Teachers
 *   description: Teacher Management
 */

/**
 * @swagger
 * /teachers:
 *   get:
 *     summary: Get all teachers
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of teachers
 */
router.get('/', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, getTeachers);

/**
 * @swagger
 * /teachers:
 *   post:
 *     summary: Register a new teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Teacher registered
 */
router.post('/', verifyToken, checkRole(['Admin', 'SuperAdmin']), registerTeacher);

/**
 * @swagger
 * /teachers/{id}:
 *   put:
 *     summary: Update a teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Teacher updated
 */
router.put('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), updateTeacher);

/**
 * @swagger
 * /teachers/{id}:
 *   delete:
 *     summary: Delete a teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teacher deleted
 */
router.delete('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), deleteTeacher);

module.exports = router;