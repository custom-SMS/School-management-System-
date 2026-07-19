const express = require('express');

const { globalCacheMiddleware } = require('../middleware/globalCacheMiddleware');
const { setCacheResource, invalidateResource } = require('../middleware/cacheMiddleware');

const router = express.Router();
const { verifyToken, checkRole, injectBranchFilter } = require('../middleware/authMiddleware');
const { getEmployees, registerEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController');

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee Management (Staff)
 */

router.get('/', verifyToken, checkRole(['SuperAdmin']), setCacheResource('users'), globalCacheMiddleware, getEmployees);

router.post('/', verifyToken, checkRole(['SuperAdmin']), invalidateResource('users'), registerEmployee);

router.put('/:id', verifyToken, checkRole(['SuperAdmin']), invalidateResource('users'), updateEmployee);

router.delete('/:id', verifyToken, checkRole(['SuperAdmin']), invalidateResource('users'), deleteEmployee);

module.exports = router;
