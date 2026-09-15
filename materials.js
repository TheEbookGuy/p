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

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, group_name, icon } = req.body;
    db.prepare(`
      UPDATE materials SET name = coalesce(?, name), group_name = coalesce(?, group_name), icon = coalesce(?, icon)
      WHERE id = ?
    `).run(name, group_name, icon, req.params.id);
    
    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details, created_at) VALUES (?,?,?,?,?,?)')
      .run('material', req.params.id, 'update', req.user.id, JSON.stringify(req.body), now);
      
    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
