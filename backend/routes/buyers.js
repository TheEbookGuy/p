// Buyers routes
const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../config/db');

// Get all buyers
router.get('/', async (req, res) => {
  try {
    const buyers = await dbAll('SELECT * FROM buyers');
    res.json(buyers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get buyer by ID
router.get('/:id', async (req, res) => {
  try {
    const buyer = await dbGet('SELECT * FROM buyers WHERE id = ?', [req.params.id]);
    if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
    res.json(buyer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create buyer
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const result = await dbRun(
      'INSERT INTO buyers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone]
    );
    res.status(201).json({ id: result.id, name, email, phone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
