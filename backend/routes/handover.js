// Handover routes
const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../config/db');

// Get all handovers
router.get('/', async (req, res) => {
  try {
    const handovers = await dbAll('SELECT * FROM handovers');
    res.json(handovers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get handover by ID
router.get('/:id', async (req, res) => {
  try {
    const handover = await dbGet('SELECT * FROM handovers WHERE id = ?', [req.params.id]);
    if (!handover) return res.status(404).json({ error: 'Handover not found' });
    res.json(handover);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create handover
router.post('/', async (req, res) => {
  try {
    const { lot_id, buyer_id, date } = req.body;
    const result = await dbRun(
      'INSERT INTO handovers (lot_id, buyer_id, date) VALUES (?, ?, ?)',
      [lot_id, buyer_id, date]
    );
    res.status(201).json({ id: result.id, lot_id, buyer_id, date });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
