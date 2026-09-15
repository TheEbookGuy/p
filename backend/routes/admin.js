// Admin routes
const express = require('express');
const router = express.Router();
const { checkRole } = require('../middleware/rbac');

// Admin dashboard (requires admin role)
router.get('/dashboard', checkRole(['admin']), (req, res) => {
  res.json({ message: 'Admin dashboard', status: 'not implemented' });
});

// Get all users (admin only)
router.get('/users', checkRole(['admin']), (req, res) => {
  res.json({ message: 'Users list endpoint', status: 'not implemented' });
});

// Delete user (admin only)
router.delete('/users/:id', checkRole(['admin']), (req, res) => {
  res.json({ message: `Delete user ${req.params.id}`, status: 'not implemented' });
});

module.exports = router;
