const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

// ─── verifyToken ──────────────────────────────────────────────────────────────
const attachAcademicYearContext = (req, res, next) => {
  // Kept here so every authenticated route receives the same year context,
  // regardless of the route-specific middleware ordering.
  const { injectActiveYear, injectAcademicYearFilter, enforceYearAccess } = require('./academicYearMiddleware');
  return injectActiveYear(req, res, (error) => {
    if (error) return next(error);
    return injectAcademicYearFilter(req, res, (filterError) => {
      if (filterError) return next(filterError);
      return enforceYearAccess(req, res, next);
    });
  });
};

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ message: 'Access Denied. No valid token provided.' });
  }
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    req.user = verified; // { _id, role, scopeType, schoolId, branchId, levelId }
    attachAcademicYearContext(req, res, next);
  } catch (err) {
    res.status(400).json({ message: 'Invalid or Expired Token' });
  }
};

const verifyTokenOptional = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
  } catch (err) {}
  if (!req.user) return next();
  attachAcademicYearContext(req, res, next);
};

// ─── checkRole ────────────────────────────────────────────────────────────────
// Legacy flat-role check — still used for Teacher/Student/Parent/Cashier routes
const checkRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Access Denied. No authenticated user.' });
  }
  // SuperAdmin always passes
  if (req.user.role === 'SuperAdmin') return next();

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access Denied. Insufficient permissions.' });
  }
  next();
};

// ─── checkScope ───────────────────────────────────────────────────────────────
// Scoped role check for multi-branch admin roles.
// allowedScopes: array of ScopeType values  e.g. ['SchoolAdmin','BranchAdmin']
// allowedRoles:  array of Role values       e.g. ['Teacher','SuperAdmin']
const checkScope = ({ allowedScopes = [], allowedRoles = [] } = {}) => (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({ message: 'Access Denied. No authenticated user.' });
  }

  // SuperAdmin always passes
  if (req.user.role === 'SuperAdmin') return next();

  // Check flat role
  if (allowedRoles.length && allowedRoles.includes(req.user.role)) return next();

  // Check scopeType
  if (allowedScopes.length && allowedScopes.includes(req.user.scopeType)) return next();

  return res.status(403).json({ message: 'Access Denied. Insufficient scope.' });
};

// ─── injectBranchFilter ───────────────────────────────────────────────────────
// Adds req.branchFilter and req.levelFilter to all requests.
// Priority: JWT claim > X-Branch-Id header (SuperAdmin/SchoolAdmin only)
// Controllers spread these into Prisma `where` clauses to auto-scope queries.
const injectBranchFilter = (req, res, next) => {
  const { role, scopeType, branchId: jwtBranchId, levelId: jwtLevelId } = req.user || {};

  // SuperAdmin sees everything — but may pass X-Branch-Id to voluntarily filter
  if (role === 'SuperAdmin') {
    const headerBranchId = req.headers['x-branch-id'] || null;
    const headerLevelId = req.headers['x-level-id'] || null;
    req.branchFilter = headerBranchId ? { branchId: headerBranchId } : {};
    req.levelFilter = headerLevelId ? { levelId: headerLevelId } : {};
    return next();
  }

  // SchoolAdmin sees all branches of their school by default;
  // honour X-Branch-Id header to let them drill into a specific branch
  if (scopeType === 'SchoolAdmin') {
    const headerBranchId = req.headers['x-branch-id'] || null;
    const headerLevelId = req.headers['x-level-id'] || null;
    req.branchFilter = headerBranchId ? { branchId: headerBranchId } : {};
    req.levelFilter = headerLevelId ? { levelId: headerLevelId } : {};
    return next();
  }

  // BranchAdmin / LevelAdmin / Cashier — locked to JWT branchId, header ignored
  if (jwtBranchId) {
    req.branchFilter = { branchId: jwtBranchId };
    // level is not used for teacher scoping right now
    req.levelFilter = {};
  } else {

    // No scope — try to derive branch from teacher JWT claims when missing.
    // This prevents teachers from getting forced into '__none__' branch.
    const fallbackBranchId = req.user.branchId;
    if (fallbackBranchId) {
      req.branchFilter = { branchId: fallbackBranchId };
    } else {
      // Safe default prevents data leakage
      req.branchFilter = { branchId: '__none__' };
    }
    req.levelFilter = {};
  }


  next();
};

// ─── checkPermission ──────────────────────────────────────────────────────────
// Permission-based check for granular operations (student_registration etc.)
const checkPermission = (permission) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Access Denied. No authenticated user.' });
  }

  if (req.user.role === 'SuperAdmin') return next();

  // SchoolAdmin and LevelAdmin inherit all Admin permissions
  // BranchAdmin permissions are now enforced - they must have the specific permission
  if (['SchoolAdmin', 'LevelAdmin'].includes(req.user.scopeType)) return next();

  try {
    const rolePerm = await prisma.rolePermission.findUnique({
      where: { role_permission: { role: req.user.role, permission } },
    });
    if (!rolePerm) {
      return res.status(403).json({
        message: `Access Denied. Role '${req.user.role}' does not have the '${permission}' permission.`,
      });
    }
    next();
  } catch (err) {
    console.error('[permission check error]', err?.message || err);
    const isDbDown = err?.message?.includes("Can't reach database") || err?.code === 'P1001';
    if (isDbDown) {
      return res.status(503).json({ message: 'Service temporarily unavailable. Please try again shortly.' });
    }
    res.status(500).json({ message: 'An unexpected error occurred checking permissions.' });
  }
};

module.exports = { verifyToken, verifyTokenOptional, checkRole, checkScope, checkPermission, injectBranchFilter };
