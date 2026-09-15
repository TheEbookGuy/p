const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.post('/', authenticate, authorize('collector'), (req, res) => {
  try {
    const { material_id, weight, photo_url } = req.body;
    if (!material_id || !weight) return res.status(400).json({ error: 'Missing required fields' });
    
    const price = db.prepare('SELECT rate FROM prices WHERE material_id = ? ORDER BY effective_from DESC LIMIT 1').get(material_id);
    const rate = price ? price.rate : 0;
    const estimated_value = weight * rate;
    
    const id = 'UM-' + uuidv4().substring(0, 6).toUpperCase();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO lots (id, collector_id, material_id, weight, estimated_value, photo_url, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'created', ?, ?)
    `).run(id, req.user.id, material_id, weight, estimated_value, photo_url, now, now);
    
    db.prepare('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details, created_at) VALUES (?,?,?,?,?,?)')
      .run('lot', id, 'create', req.user.id, JSON.stringify({ material_id, weight, estimated_value }), now);
      
    const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(id);
    res.status(201).json(lot);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authenticate, (req, res) => {
  try {
    let query = `
      SELECT l.*, m.name as material_name, m.group_name 
      FROM lots l 
      JOIN materials m ON l.material_id = m.id
    `;
    let params = [];
    
    if (req.user.role === 'collector') {
      query += ' WHERE l.collector_id = ?';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY l.created_at DESC';
    const lots = db.prepare(query).all(...params);
    res.json(lots);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const lot = db.prepare(`
      SELECT l.*, m.name as material_name, m.group_name 
      FROM lots l JOIN materials m ON l.material_id = m.id 
      WHERE l.id = ?
    `).get(req.params.id);
    
    if (!lot) return res.status(404).json({ error: 'Lot not found' });
    
    lot.matches = db.prepare(`
      SELECT bm.*, b.name as buyer_name, b.rate_offered, b.type as buyer_type
      FROM buyer_matches bm
      JOIN buyers b ON bm.buyer_id = b.id
      WHERE bm.lot_id = ?
    `).all(req.params.id);
    const selectedMatch = lot.matches.find(m => m.selected === 1);
    if (selectedMatch) {
      lot.buyer_id = selectedMatch.buyer_id;
      lot.buyer_name = selectedMatch.buyer_name;
      lot.buyer_rate = selectedMatch.rate_offered;
    }
    const handover = db.prepare('SELECT h.*, b.name as buyer_name FROM handover_events h JOIN buyers b ON h.buyer_id = b.id WHERE h.lot_id = ?').get(req.params.id);
    if (handover) {
      lot.handover = handover;
      lot.buyer_id = lot.buyer_id || handover.buyer_id;
      lot.buyer_name = lot.buyer_name || handover.buyer_name;
    }
    res.json(lot);
  } catch (error) {
    console.error('Error in GET /lots/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', authenticate, (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });
    
    const now = new Date().toISOString();
    db.prepare('UPDATE lots SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);
    
    db.prepare('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details, created_at) VALUES (?,?,?,?,?,?)')
      .run('lot', req.params.id, 'status_update', req.user.id, JSON.stringify({ status }), now);
      
    const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
    res.json(lot);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/trail', authenticate, (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM audit_log WHERE entity_type = 'lot' AND entity_id = ? ORDER BY created_at ASC
    `).all(req.params.id);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Buyer matching for a lot ──
router.get('/:id/matches', authenticate, (req, res) => {
  try {
    const lotId = req.params.id;

    // Return existing matches if already computed
    const existing = db.prepare(`
      SELECT bm.*, b.name, b.type, b.distance_km, b.rate_offered,
             b.auth_status, b.score, b.pickup, b.materials_accepted
      FROM buyer_matches bm
      JOIN buyers b ON bm.buyer_id = b.id
      WHERE bm.lot_id = ?
      ORDER BY bm.rank ASC
    `).all(lotId);
    if (existing.length > 0) return res.json(existing);

    // Compute matches
    const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(lotId);
    if (!lot) return res.status(404).json({ error: 'Lot not found' });

    const buyers = db.prepare(
      "SELECT * FROM buyers WHERE materials_accepted LIKE '%' || ? || '%' AND active = 1"
    ).all(lot.material_id);

    const now = new Date().toISOString();
    const scored = buyers.map(buyer => {
      const baseScore = (buyer.score || 80) * 0.4;
      const pickupBonus = buyer.pickup ? 10 : 0;
      const rateFactor = Math.min(30, (buyer.rate_offered || 0) / 25);
      const distFactor = Math.max(0, 20 - (buyer.distance_km || 0) * 0.5);
      const match_score = Math.round((baseScore + pickupBonus + rateFactor + distFactor) * 10) / 10;
      return { buyer, match_score };
    }).sort((a, b) => b.match_score - a.match_score);

    const insertMatch = db.prepare(
      'INSERT INTO buyer_matches (lot_id, buyer_id, match_score, rank, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    const result = db.transaction(() => {
      return scored.map((s, i) => {
        const rank = i + 1;
        insertMatch.run(lotId, s.buyer.id, s.match_score, rank, now);
        return {
          buyer_id: s.buyer.id, name: s.buyer.name, type: s.buyer.type,
          distance_km: s.buyer.distance_km, rate_offered: s.buyer.rate_offered,
          auth_status: s.buyer.auth_status, score: s.buyer.score,
          pickup: s.buyer.pickup, materials_accepted: s.buyer.materials_accepted,
          match_score: s.match_score, rank
        };
      });
    })();

    // Update lot status
    db.prepare("UPDATE lots SET status = 'matched', updated_at = ? WHERE id = ? AND status = 'created'").run(now, lotId);
    db.prepare('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details, created_at) VALUES (?,?,?,?,?,?)')
      .run('lot', lotId, 'matched', req.user.id, JSON.stringify({ buyers_found: result.length }), now);

    res.json(result);
  } catch (error) {
    console.error('Error in /lots/:id/matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Select a buyer for a lot ──
router.post('/:id/select-buyer', authenticate, (req, res) => {
  try {
    const { buyer_id } = req.body;
    if (!buyer_id) return res.status(400).json({ error: 'buyer_id is required' });

    const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Lot not found' });

    const now = new Date().toISOString();

    db.transaction(() => {
      // Mark this match as selected
      db.prepare('UPDATE buyer_matches SET selected = 0 WHERE lot_id = ?').run(req.params.id);
      db.prepare('UPDATE buyer_matches SET selected = 1 WHERE lot_id = ? AND buyer_id = ?').run(req.params.id, buyer_id);
      // Update lot status
      db.prepare("UPDATE lots SET status = 'buyer_selected', updated_at = ? WHERE id = ?").run(now, req.params.id);
    })();

    const buyer = db.prepare('SELECT name FROM buyers WHERE id = ?').get(buyer_id);
    db.prepare('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details, created_at) VALUES (?,?,?,?,?,?)')
      .run('lot', req.params.id, 'buyer_selected', req.user.id,
        JSON.stringify({ buyer_id, buyer_name: buyer ? buyer.name : 'Unknown' }), now);

    const updatedLot = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
    res.json(updatedLot);
  } catch (error) {
    console.error('Error in /lots/:id/select-buyer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

