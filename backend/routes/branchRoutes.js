const express = require('express');
const router  = express.Router();
const { verifyToken, checkRole, checkScope } = require('../middleware/authMiddleware');
const {
  getSchools, createSchool, updateSchool,
  getBranches, getBranchById, createBranch, updateBranch,
  getLevelsByBranch, createLevel, updateLevel, deleteLevel,
  getUserScopes, assignUserScope, removeUserScope, deleteSchool, deleteBranch
} = require('../controllers/branchController');

// Only SuperAdmin can manage Schools
router.get('/schools',      verifyToken, checkRole(['SuperAdmin']), getSchools);
router.post('/schools',     verifyToken, checkRole(['SuperAdmin']), createSchool);
router.put('/schools/:id',  verifyToken, checkRole(['SuperAdmin']), updateSchool);
router.delete('/schools/:id', verifyToken, checkRole(['SuperAdmin']), deleteSchool);
router.delete('/branches/:id', verifyToken, checkRole(['SuperAdmin']), deleteBranch);

// SuperAdmin + SchoolAdmin can manage Branches
router.get('/branches',      verifyToken, checkScope({ allowedScopes: ['SchoolAdmin', 'BranchAdmin', 'LevelAdmin', 'Cashier'], allowedRoles: ['SuperAdmin'] }), getBranches);
router.get('/branches/:id',  verifyToken, checkScope({ allowedScopes: ['SchoolAdmin', 'BranchAdmin', 'LevelAdmin', 'Cashier'], allowedRoles: ['SuperAdmin'] }), getBranchById);
router.post('/branches',     verifyToken, checkRole(['SuperAdmin']), createBranch);
router.put('/branches/:id',  verifyToken, checkScope({ allowedScopes: ['SchoolAdmin'], allowedRoles: ['SuperAdmin'] }), updateBranch);

// SuperAdmin + SchoolAdmin + BranchAdmin can manage Levels
router.get('/branches/:branchId/levels', verifyToken, checkScope({ allowedScopes: ['SchoolAdmin','BranchAdmin'], allowedRoles: ['SuperAdmin'] }), getLevelsByBranch);
router.post('/levels',     verifyToken, checkScope({ allowedScopes: ['SchoolAdmin','BranchAdmin'], allowedRoles: ['SuperAdmin'] }), createLevel);
router.put('/levels/:id',  verifyToken, checkScope({ allowedScopes: ['SchoolAdmin','BranchAdmin'], allowedRoles: ['SuperAdmin'] }), updateLevel);
router.delete('/levels/:id', verifyToken, checkScope({ allowedScopes: ['SchoolAdmin','BranchAdmin'], allowedRoles: ['SuperAdmin'] }), deleteLevel);

// Scope management — SuperAdmin + SchoolAdmin only
router.get('/scopes',      verifyToken, checkScope({ allowedScopes: ['SchoolAdmin'], allowedRoles: ['SuperAdmin'] }), getUserScopes);
router.post('/scopes',     verifyToken, checkScope({ allowedScopes: ['SchoolAdmin'], allowedRoles: ['SuperAdmin'] }), assignUserScope);
router.delete('/scopes/:id', verifyToken, checkScope({ allowedScopes: ['SchoolAdmin'], allowedRoles: ['SuperAdmin'] }), removeUserScope);

module.exports = router;
