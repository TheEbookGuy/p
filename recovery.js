const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { optionalAuth } = require('../middleware/auth');

router.get('/stats', optionalAuth, (req, res) => {
  try {
    const totals = db.prepare(`
      SELECT 
        SUM(weight) as total_captured_kg,
        SUM(CASE WHEN status IN ('completed', 'handed_over') THEN weight ELSE 0 END) as total_recovered_kg,
        COUNT(id) as lots_captured,
        SUM(CASE WHEN status IN ('matched', 'buyer_selected', 'handover_pending', 'handed_over', 'completed') THEN 1 ELSE 0 END) as lots_matched,
        SUM(CASE WHEN status IN ('handed_over', 'completed') THEN 1 ELSE 0 END) as lots_handed_over,
        SUM(CASE WHEN photo_url IS NOT NULL THEN 1 ELSE 0 END) as lots_with_photo
      FROM lots
    `).get();
    
    const txs = db.prepare(`
      SELECT 
        COUNT(id) as total_tx,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_tx
      FROM transactions
    `).get();
    
    const streamData = db.prepare(`
      SELECT m.group_name, SUM(l.weight) as weight
      FROM lots l JOIN materials m ON l.material_id = m.id
      GROUP BY m.group_name
    `).all();
    
    const recovery_rate = totals.total_captured_kg ? (totals.total_recovered_kg / totals.total_captured_kg) * 100 : 0;
    const traceability_pct = totals.lots_captured ? (totals.lots_with_photo / totals.lots_captured) * 100 : 0;
    const authorized_route_pct = totals.lots_captured ? (totals.lots_handed_over / totals.lots_captured) * 100 : 0;
    const payment_closure_pct = txs.total_tx ? (txs.paid_tx / txs.total_tx) * 100 : 0;
    
    res.json({
      total_captured_kg: totals.total_captured_kg || 0,
      total_recovered_kg: totals.total_recovered_kg || 0,
      recovery_rate,
      traceability_pct,
      authorized_route_pct,
      by_stream: streamData,
      lots_captured: totals.lots_captured || 0,
      lots_matched: totals.lots_matched || 0,
      lots_handed_over: totals.lots_handed_over || 0,
      photo_evidence_pct: traceability_pct,
      weight_records_pct: 100,
      payment_closure_pct
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
