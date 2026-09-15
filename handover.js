const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, (req, res) => {
  try {
    const { lot_id, buyer_id, weight_verified, notes, location_lat, location_lng } = req.body;
    if (!lot_id || !buyer_id || !weight_verified) return res.status(400).json({ error: 'Missing required fields' });
    
    const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(lot_id);
    if (!lot) return res.status(404).json({ error: 'Lot not found' });
    
    if (req.user.role === 'collector' && lot.collector_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(buyer_id);
    let rate = buyer && buyer.rate_offered ? buyer.rate_offered : null;
    if (!rate) {
      const price = db.prepare('SELECT rate FROM prices WHERE material_id = ? ORDER BY effective_from DESC LIMIT 1').get(lot.material_id);
      rate = price ? price.rate : 0;
    }
    
    const total_amount = weight_verified * rate;
    const now = new Date().toISOString();
    const verification_ref = 'HV-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    
    db.transaction(() => {
      const handover_id = db.prepare(`
        INSERT INTO handover_events (lot_id, collector_id, buyer_id, weight_verified, status, verification_ref, location_lat, location_lng, notes, created_at)
        VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?)
      `).run(lot_id, lot.collector_id, buyer_id, weight_verified, verification_ref, location_lat, location_lng, notes, now).lastInsertRowid;
      
      db.prepare('UPDATE lots SET status = ?, updated_at = ? WHERE id = ?').run('handed_over', now, lot_id);
      
      const transaction_id = db.prepare(`
        INSERT INTO transactions (lot_id, collector_id, buyer_id, material_id, weight, rate, total_amount, payment_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(lot_id, lot.collector_id, buyer_id, lot.material_id, weight_verified, rate, total_amount, now).lastInsertRowid;
      
      db.prepare('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details, created_at) VALUES (?,?,?,?,?,?)')
        .run('handover', handover_id.toString(), 'create', req.user.id, JSON.stringify({ lot_id, transaction_id }), now);
    })();
    
    const handover = db.prepare('SELECT * FROM handover_events WHERE verification_ref = ?').get(verification_ref);
    const transaction = db.prepare('SELECT * FROM transactions WHERE lot_id = ? ORDER BY id DESC LIMIT 1').get(lot_id);
    
    res.status(201).json({ handover, transaction });
  } catch (error) {
    console.error('Error in POST /handover:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:lotId', authenticate, (req, res) => {
  try {
    const events = db.prepare(`
      SELECT h.*, b.name as buyer_name 
      FROM handover_events h 
      JOIN buyers b ON h.buyer_id = b.id 
      WHERE h.lot_id = ?
    `).all(req.params.lotId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
