const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, authorize('collector'), (req, res) => {
  try {
    const txs = db.prepare(`
      SELECT t.*, m.name as material_name, m.icon as material_icon, b.name as buyer_name
      FROM transactions t
      JOIN materials m ON t.material_id = m.id
      LEFT JOIN buyers b ON t.buyer_id = b.id
      WHERE t.collector_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.id);
    res.json(txs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/summary', authenticate, authorize('collector'), (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT 
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_earned,
        SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as pending,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        AVG(total_amount) as avg_lot_value,
        COUNT(id) as total_lots,
        SUM(weight) as total_weight
      FROM transactions
      WHERE collector_id = ?
    `).get(req.user.id);
    
    res.json({
      total_earned: summary.total_earned || 0,
      pending: summary.pending || 0,
      paid_count: summary.paid_count || 0,
      avg_lot_value: summary.avg_lot_value || 0,
      total_lots: summary.total_lots || 0,
      total_weight: summary.total_weight || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
