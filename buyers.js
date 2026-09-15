const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/buyers — list active buyers
router.get('/', (req, res) => {
  try {
    const buyers = db.prepare('SELECT * FROM buyers WHERE active = 1').all();
    res.json(buyers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
