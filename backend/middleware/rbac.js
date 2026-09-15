// Role-based access control middleware

const roles = {
  admin: ['admin', 'user'],
  user: ['user'],
  guest: ['guest']
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role || 'guest';
    
    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  };
};

module.exports = { checkRole, roles };
