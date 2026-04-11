const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access Denied. No valid token provided.' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
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

module.exports = { verifyToken, checkRole };