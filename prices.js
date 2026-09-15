const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', (req, res) => {
  try {
    const materials = db.prepare(`
      SELECT m.id, m.group_name, m.name, m.icon, m.unit,
             p.rate, p.trend, p.delta
      FROM materials m
      LEFT JOIN (
        SELECT * FROM prices p1 WHERE effective_from = (SELECT MAX(effective_from) FROM prices p2 WHERE p2.material_id = p1.material_id)
      ) p ON m.id = p.material_id
    `).all();
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:materialId', authenticate, authorize('admin'), (req, res) => {
  try {
    const { rate, trend = 'flat', delta = 'steady' } = req.body;
    if (rate === undefined) return res.status(400).json({ error: 'Rate required' });
    
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO prices (material_id, rate, trend, delta, effective_from, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.materialId, rate, trend, delta, now, req.user.id);
    
    db.prepare('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details, created_at) VALUES (?,?,?,?,?,?)')
      .run('price', info.lastInsertRowid.toString(), 'insert', req.user.id, JSON.stringify({ rate, trend, delta }), now);
      
    const price = db.prepare('SELECT * FROM prices WHERE id = ?').get(info.lastInsertRowid);
    res.json(price);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
