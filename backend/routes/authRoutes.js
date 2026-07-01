const express = require('express');
const router = express.Router();
const { 
  login, 
  logout, 
  registerInitialAdmin,
  getRolePermissions,
  updateRolePermissions,
  getCurrentUserPermissions
} = require('../controllers/authController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User Authentication and Permissions
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: 'admin@school.com'
 *               password:
 *                 type: string
 *                 example: 'admin'
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       400:
 *         description: Invalid email or password
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out the current user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', logout);

/**
 * @swagger
 * /auth/register-admin:
 *   post:
 *     summary: Register an initial Admin user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 example: 'Admin'
 *     responses:
 *       201:
 *         description: Admin user created successfully
 */
router.post('/register-admin', registerInitialAdmin);

/**
 * @swagger
 * /auth/permissions:
 *   get:
 *     summary: Get all role permissions
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get('/permissions', verifyToken, checkRole(['SuperAdmin', 'Admin']), getRolePermissions);

/**
 * @swagger
 * /auth/permissions:
 *   post:
 *     summary: Update role permissions
 *     tags: [Authentication]
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
 *               role:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Permissions updated successfully
 */
router.post('/permissions', verifyToken, checkRole(['SuperAdmin']), updateRolePermissions);

/**
 * @swagger
 * /auth/permissions/me:
 *   get:
 *     summary: Get current user's permissions
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of permissions for the logged-in user
 */
router.get('/permissions/me', verifyToken, getCurrentUserPermissions);

module.exports = router;