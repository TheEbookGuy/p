// Materials routes
const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../config/db');

// Get all materials
router.get('/', async (req, res) => {
  try {
    const materials = await dbAll('SELECT * FROM materials');
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get material by ID
router.get('/:id', async (req, res) => {
  try {
    const material = await dbGet('SELECT * FROM materials WHERE id = ?', [req.params.id]);
    if (!material) return res.status(404).json({ error: 'Material not found' });
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create material
router.post('/', async (req, res) => {
  try {
    const { name, description, category } = req.body;
    const result = await dbRun(
      'INSERT INTO materials (name, description, category) VALUES (?, ?, ?)',
      [name, description, category]
    );
    res.status(201).json({ id: result.id, name, description, category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
