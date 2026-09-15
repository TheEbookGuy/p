const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, (req, res) => {
  try {
    const isCollector = req.user && req.user.role === 'collector';
    const collectorFilter = isCollector ? 'AND collector_id = ?' : '';
    const params = isCollector ? [req.user.id] : [];
    
    const lots_stats = db.prepare(`
      SELECT 
        SUM(CASE WHEN status != 'completed' THEN 1 ELSE 0 END) as active_lots,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_lots,
        SUM(CASE WHEN status IN ('completed', 'handed_over') THEN weight ELSE 0 END) as total_recovered_kg,
        SUM(CASE WHEN status IN ('handover_pending', 'buyer_selected') THEN 1 ELSE 0 END) as pending_handovers
      FROM lots WHERE 1=1 ${collectorFilter}
    `).get(...params);
    
    const tx_stats = db.prepare(`
      SELECT SUM(total_amount) as total_earnings
      FROM transactions WHERE 1=1 ${collectorFilter}
    `).get(...params);
    
    const auditQuery = isCollector ? 
      'SELECT * FROM audit_log WHERE actor_id = ? ORDER BY created_at DESC LIMIT 10' :
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10';
    const recent_activity = db.prepare(auditQuery).all(...(isCollector ? [req.user.id] : []));
    
    res.json({
      active_lots: lots_stats.active_lots || 0,
      completed_lots: lots_stats.completed_lots || 0,
      total_recovered_kg: lots_stats.total_recovered_kg || 0,
      total_earnings: tx_stats.total_earnings || 0,
      pending_handovers: lots_stats.pending_handovers || 0,
      recent_activity
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
