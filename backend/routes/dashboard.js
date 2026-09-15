// Dashboard routes
const express = require('express');
const router = express.Router();
const { dbGet, dbAll } = require('../config/db');

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalMaterials = await dbGet('SELECT COUNT(*) as count FROM materials');
    const totalLots = await dbGet('SELECT COUNT(*) as count FROM lots');
    const totalBuyers = await dbGet('SELECT COUNT(*) as count FROM buyers');
    const totalEarnings = await dbGet('SELECT SUM(amount) as total FROM earnings');
    
    res.json({
      totalMaterials: totalMaterials.count,
      totalLots: totalLots.count,
      totalBuyers: totalBuyers.count,
      totalEarnings: totalEarnings.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
