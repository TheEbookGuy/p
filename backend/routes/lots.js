// Lots routes
const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../config/db');

// Get all lots
router.get('/', async (req, res) => {
  try {
    const lots = await dbAll('SELECT * FROM lots');
    res.json(lots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get lot by ID
router.get('/:id', async (req, res) => {
  try {
    const lot = await dbGet('SELECT * FROM lots WHERE id = ?', [req.params.id]);
    if (!lot) return res.status(404).json({ error: 'Lot not found' });
    res.json(lot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create lot
router.post('/', async (req, res) => {
  try {
    const { name, quantity, material_id } = req.body;
    const result = await dbRun(
      'INSERT INTO lots (name, quantity, material_id) VALUES (?, ?, ?)',
      [name, quantity, material_id]
    );
    res.status(201).json({ id: result.id, name, quantity, material_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
