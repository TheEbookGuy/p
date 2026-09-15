// Earnings routes
const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../config/db');

// Get all earnings
router.get('/', async (req, res) => {
  try {
    const earnings = await dbAll('SELECT * FROM earnings');
    res.json(earnings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get earnings by ID
router.get('/:id', async (req, res) => {
  try {
    const earning = await dbGet('SELECT * FROM earnings WHERE id = ?', [req.params.id]);
    if (!earning) return res.status(404).json({ error: 'Earning record not found' });
    res.json(earning);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create earning
router.post('/', async (req, res) => {
  try {
    const { handover_id, amount, date } = req.body;
    const result = await dbRun(
      'INSERT INTO earnings (handover_id, amount, date) VALUES (?, ?, ?)',
      [handover_id, amount, date]
    );
    res.status(201).json({ id: result.id, handover_id, amount, date });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
