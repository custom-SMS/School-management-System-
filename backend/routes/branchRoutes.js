const express = require('express');

const { globalCacheMiddleware } = require('../middleware/globalCacheMiddleware');
const { setCacheResource, invalidateResource } = require('../middleware/cacheMiddleware');

const router  = express.Router();
const { verifyToken, checkRole, checkScope } = require('../middleware/authMiddleware');
const {
  getSchools, createSchool, updateSchool,
  getBranches, getBranchById, createBranch, updateBranch,
  getLevelsByBranch, createLevel, updateLevel, deleteLevel,
  getUserScopes, assignUserScope, removeUserScope, deleteSchool, deleteBranch
} = require('../controllers/branchController');

// Only SuperAdmin can manage Schools
router.get('/schools',      verifyToken, checkRole(['SuperAdmin']), setCacheResource('branches'), globalCacheMiddleware, getSchools);
router.post('/schools',     verifyToken, checkRole(['SuperAdmin']), invalidateResource('branches'), createSchool);
router.put('/schools/:id',  verifyToken, checkRole(['SuperAdmin']), invalidateResource('branches'), updateSchool);
router.delete('/schools/:id', verifyToken, checkRole(['SuperAdmin']), invalidateResource('branches'), deleteSchool);
router.delete('/branches/:id', verifyToken, checkRole(['SuperAdmin']), invalidateResource('branches'), deleteBranch);

// SuperAdmin + SchoolAdmin can manage Branches
router.get('/branches',      verifyToken, checkScope({ allowedScopes: ['SchoolAdmin', 'BranchAdmin', 'LevelAdmin', 'Cashier'], allowedRoles: ['SuperAdmin'] }), setCacheResource('branches'), globalCacheMiddleware, getBranches);
router.get('/branches/:id',  verifyToken, checkScope({ allowedScopes: ['SchoolAdmin', 'BranchAdmin', 'LevelAdmin', 'Cashier'], allowedRoles: ['SuperAdmin'] }), setCacheResource('branches'), globalCacheMiddleware, getBranchById);
router.post('/branches',     verifyToken, checkRole(['SuperAdmin']), invalidateResource('branches'), createBranch);
router.put('/branches/:id',  verifyToken, checkScope({ allowedScopes: ['SchoolAdmin'], allowedRoles: ['SuperAdmin'] }), invalidateResource('branches'), updateBranch);

// SuperAdmin + SchoolAdmin + BranchAdmin can manage Levels
router.get('/branches/:branchId/levels', verifyToken, checkScope({ allowedScopes: ['SchoolAdmin','BranchAdmin'], allowedRoles: ['SuperAdmin'] }), setCacheResource('branches'), globalCacheMiddleware, getLevelsByBranch);
router.post('/levels',     verifyToken, checkScope({ allowedScopes: ['SchoolAdmin','BranchAdmin'], allowedRoles: ['SuperAdmin'] }), invalidateResource('branches'), createLevel);
router.put('/levels/:id',  verifyToken, checkScope({ allowedScopes: ['SchoolAdmin','BranchAdmin'], allowedRoles: ['SuperAdmin'] }), invalidateResource('branches'), updateLevel);
router.delete('/levels/:id', verifyToken, checkScope({ allowedScopes: ['SchoolAdmin','BranchAdmin'], allowedRoles: ['SuperAdmin'] }), invalidateResource('branches'), deleteLevel);

// Scope management — SuperAdmin + SchoolAdmin only
router.get('/scopes',      verifyToken, checkScope({ allowedScopes: ['SchoolAdmin'], allowedRoles: ['SuperAdmin'] }), setCacheResource('branches'), globalCacheMiddleware, getUserScopes);
router.post('/scopes',     verifyToken, checkScope({ allowedScopes: ['SchoolAdmin'], allowedRoles: ['SuperAdmin'] }), invalidateResource('branches'), assignUserScope);
router.delete('/scopes/:id', verifyToken, checkScope({ allowedScopes: ['SchoolAdmin'], allowedRoles: ['SuperAdmin'] }), invalidateResource('branches'), removeUserScope);

module.exports = router;
