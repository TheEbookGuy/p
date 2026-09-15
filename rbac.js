// middleware/rbac.js — Role-based access control

/**
 * Returns middleware that allows only the listed roles.
 * Must be used AFTER authenticate middleware.
 *
 * Usage: router.get('/admin/users', authenticate, authorize('admin'), handler)
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authorize };
