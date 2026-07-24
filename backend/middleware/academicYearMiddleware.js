/**
 * Academic Year Middleware
 * 
 * This middleware handles academic year filtering and access control.
 * It injects the active academic year and enforces year-based access rules.
 */

const { getActiveAcademicYear } = require('../utils/academicYear');

/**
 * Get active academic year with caching and persistent fallback
 */
async function getActiveYear(branchId) {
  try {
    const activeYear = await getActiveAcademicYear({ branchId });
    return activeYear;
  } catch (error) {
    console.error('Error fetching active academic year:', error);
    return null;
  }
}

/**
 * Inject active academic year into request
 */
const injectActiveYear = async (req, res, next) => {
  try {
    const activeYear = await getActiveYear();
    req.activeYear = activeYear;
    next();
  } catch (error) {
    console.error('Error in injectActiveYear middleware:', error);
    next();
  }
};

/**
 * Inject academic year filter based on user role
 */
const injectAcademicYearFilter = (req, res, next) => {
  const { user, activeYear } = req;

  // This middleware is intentionally run after verifyToken.  Public routes and
  // login must never be blocked while the first academic year is being created.
  if (!user) return next();

  // Support the header already used by the frontend, while retaining the
  // documented header for API clients.
  const requestedYearId = req.headers?.['x-super-admin-year-view-id']
    || req.headers?.['x-academic-year-id'];

  const applyContext = async () => {
    let selectedYear = activeYear || null;

    if (user.role === 'SuperAdmin' && requestedYearId) {
      selectedYear = await prisma.academicYear.findUnique({ where: { id: requestedYearId } });
      if (!selectedYear) {
        return res.status(400).json({ message: 'The selected academic year does not exist.' });
      }
    }

    req.selectedAcademicYear = selectedYear;
    req.academicYearFilter = selectedYear ? { academicYearId: selectedYear.id } : {};
    req.isHistoricalAccess = Boolean(selectedYear && activeYear && selectedYear.id !== activeYear.id);
    return next();
  };

  applyContext().catch(next);
};

/**
 * Check if historical access is allowed for this role and path
 */
function isHistoricalAccessAllowed(role, path) {
  const allowedPaths = {
    'Admin': ['/api/reports', '/api/students/:id/history', '/api/analytics'],
    'Teacher': ['/api/students/:id/history', '/api/report-cards', '/api/analytics'],
    'Cashier': ['/api/payments/history', '/api/analytics'],
    'Student': ['/api/students/me/history', '/api/report-cards'],
    'Parent': ['/api/students/:id/history', '/api/report-cards']
  };
  
  const rolePaths = allowedPaths[role] || [];
  return rolePaths.some(allowedPath => path.startsWith(allowedPath));
}

/**
 * Enforce year-based access control
 */
const enforceYearAccess = (req, res, next) => {
  const { user, activeYear, academicYearFilter, isHistoricalAccess } = req;
  
  // Super Admin can access any year
  if (!user || user.role === 'SuperAdmin') {
    return next();
  }
  
  // Other roles can only access active year unless explicitly allowed
  if (isHistoricalAccess) {
    if (req.method === 'GET' && isHistoricalAccessAllowed(user.role, req.path)) {
      req.isHistoricalAccess = true;
      return next();
    }
    
    return res.status(403).json({ 
      message: 'You can only access the current active academic year. Historical access is read-only and limited to specific endpoints.' 
    });
  }
  
  next();
};

/**
 * Protect historical data edits
 * Only Super Admin can edit non-active year data
 */
const protectHistoricalEdits = (req, res, next) => {
  const { user, activeYear, academicYearFilter, isHistoricalAccess } = req;
  
  // Only Super Admin can edit non-active years
  if (user.role !== 'SuperAdmin' && isHistoricalAccess) {
    return res.status(403).json({
      message: 'Only Super Admin can edit historical data'
    });
  }
  
  // Super Admin editing historical data
  if (user.role === 'SuperAdmin' && isHistoricalAccess) {
    req.isHistoricalEdit = true;
  }
  
  next();
};

module.exports = {
  injectActiveYear,
  injectAcademicYearFilter,
  enforceYearAccess,
  protectHistoricalEdits,
  getActiveYear,
  isHistoricalAccessAllowed
};
