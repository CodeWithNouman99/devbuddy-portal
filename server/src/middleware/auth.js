// Route guards.
//   requireAuth          -> must be logged in
//   requireRole('admin') -> must be logged in AND have one of the given roles
const User = require('../models/User');
const { COOKIE_NAME, verifyToken } = require('../utils/token');

async function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: 'Please sign in.' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }

  // Look the user up again so a deleted or deactivated account (or a changed
  // role) takes effect immediately, not when the token expires.
  const user = await User.findById(payload.sub);
  if (!user || user.active === false) {
    return res.status(401).json({ message: 'Please sign in.' });
  }

  req.user = user; // later middleware and routes can use req.user
  next();
}

// Usage: router.get('/admin-only', requireAuth, requireRole('admin'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
