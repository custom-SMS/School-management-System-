const express = require('express');

const { globalCacheMiddleware } = require('../middleware/globalCacheMiddleware');
const { setCacheResource, invalidateResource } = require('../middleware/cacheMiddleware');

const router = express.Router();
const { createSubject, getSubjects, updateSubject, deleteSubject } = require('../controllers/subjectController');
const { verifyToken, checkRole, injectBranchFilter } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Subjects
 *   description: Subject Management
 */

/**
 * @swagger
 * /subjects:
 *   get:
 *     summary: Get all subjects
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of subjects
 */
router.get('/', verifyToken, injectBranchFilter, setCacheResource('classrooms'), globalCacheMiddleware, getSubjects);

/**
 * @swagger
 * /subjects:
 *   post:
 *     summary: Create a subject
 *     tags: [Subjects]
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
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Subject created
 */
router.post('/', verifyToken, checkRole(['Admin', 'SuperAdmin']), invalidateResource('classrooms'), createSubject);

/**
 * @swagger
 * /subjects/{id}:
 *   put:
 *     summary: Update a subject
 *     tags: [Subjects]
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
 *             properties:
 *               name:
 *                 type: string
 *               department:
 *                 type: string
 *               gradesOffered:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Subject updated
 */
router.put('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, invalidateResource('classrooms'), updateSubject);

/**
 * @swagger
 * /subjects/{id}:
 *   delete:
 *     summary: Delete a subject
 *     tags: [Subjects]
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
 *         description: Subject deleted
 */
router.delete('/:id', verifyToken, checkRole(['Admin', 'SuperAdmin']), injectBranchFilter, invalidateResource('classrooms'), deleteSubject);

module.exports = router;
