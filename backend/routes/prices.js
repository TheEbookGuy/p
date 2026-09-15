// Prices routes
const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../config/db');

// Get all prices
router.get('/', async (req, res) => {
  try {
    const prices = await dbAll('SELECT * FROM prices');
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get price by ID
router.get('/:id', async (req, res) => {
  try {
    const price = await dbGet('SELECT * FROM prices WHERE id = ?', [req.params.id]);
    if (!price) return res.status(404).json({ error: 'Price not found' });
    res.json(price);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create price
router.post('/', async (req, res) => {
  try {
    const { material_id, price, currency } = req.body;
    const result = await dbRun(
      'INSERT INTO prices (material_id, price, currency) VALUES (?, ?, ?)',
      [material_id, price, currency]
    );
    res.status(201).json({ id: result.id, material_id, price, currency });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
