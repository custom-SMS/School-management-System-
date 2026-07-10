const express = require('express');
const router = express.Router();
const { verifyToken, checkRole, injectBranchFilter } = require('../middleware/authMiddleware');
const { getEmployees, registerEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController');

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee Management (Staff)
 */

router.get('/', verifyToken, checkRole(['SuperAdmin']), getEmployees);

router.post('/', verifyToken, checkRole(['SuperAdmin']), registerEmployee);

router.put('/:id', verifyToken, checkRole(['SuperAdmin']), updateEmployee);

router.delete('/:id', verifyToken, checkRole(['SuperAdmin']), deleteEmployee);

module.exports = router;
