const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const verifyToken = (req, res, next) => {
  // Auth token is delivered via an httpOnly cookie set at login.
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: 'Access Denied. No valid token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    req.user = verified; // { _id, role, etc. }
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid or Expired Token' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access Denied. Insufficient permissions.' });
    }
    next();
  };
};

const checkPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access Denied. No authenticated user.' });
    }

    if (req.user.role === 'SuperAdmin') {
      return next();
    }

    try {
      const rolePerm = await prisma.rolePermission.findUnique({
        where: {
          role_permission: {
            role: req.user.role,
            permission: permission
          }
        }
      });

      if (!rolePerm) {
        return res.status(403).json({ message: `Access Denied. Role '${req.user.role}' does not have the '${permission}' permission.` });
      }

      next();
    } catch (err) {
      res.status(500).json({ message: 'Error checking permissions', error: err.message });
    }
  };
};

module.exports = { verifyToken, checkRole, checkPermission };