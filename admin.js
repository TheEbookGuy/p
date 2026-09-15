const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/users', authenticate, authorize('admin'), (req, res) => {
  try {
    let query = 'SELECT id, email, name, role, phone, preferred_language, collector_id, created_at, updated_at FROM users';
    let params = [];
    if (req.query.role) {
      query += ' WHERE role = ?';
      params.push(req.query.role);
    }
    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, role, phone, preferred_language } = req.body;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users SET
        name = coalesce(?, name),
        role = coalesce(?, role),
        phone = coalesce(?, phone),
        preferred_language = coalesce(?, preferred_language),
        updated_at = ?
      WHERE id = ?
    `).run(name, role, phone, preferred_language, now, req.params.id);

    db.prepare('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details, created_at) VALUES (?,?,?,?,?,?)')
      .run('user', req.params.id, 'admin_update', req.user.id, JSON.stringify(req.body), now);

    const user = db.prepare('SELECT id, email, name, role, phone, preferred_language, collector_id, created_at, updated_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error in PUT /admin/users/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/lots', authenticate, authorize('admin'), (req, res) => {
  try {
    let query = 'SELECT l.*, m.name as material_name, m.group_name FROM lots l JOIN materials m ON l.material_id = m.id';
    let params = [];
    if (req.query.status) {
      query += ' WHERE l.status = ?';
      params.push(req.query.status);
    }
    const lots = db.prepare(query).all(...params);
    res.json(lots);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', authenticate, authorize('admin'), (req, res) => {
  try {
    const stats = {
      total_users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
      total_collectors: db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'collector'").get().c,
      total_buyers_count: db.prepare('SELECT COUNT(*) as c FROM buyers').get().c,
      total_lots: db.prepare('SELECT COUNT(*) as c FROM lots').get().c,
      total_transactions: db.prepare('SELECT COUNT(*) as c FROM transactions').get().c,
      total_revenue: db.prepare('SELECT SUM(total_amount) as s FROM transactions').get().s || 0,
      materials_count: db.prepare('SELECT COUNT(*) as c FROM materials').get().c
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/buyers', authenticate, authorize('admin'), (req, res) => {
  try {
    const buyers = db.prepare('SELECT * FROM buyers').all();
    res.json(buyers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/buyers', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, type, address, lat, lng, distance_km, rate_offered, auth_status = 'pending', auth_expiry, score = 80, pickup = 0, materials_accepted, active = 1 } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO buyers (id, name, type, address, lat, lng, distance_km, rate_offered, auth_status, auth_expiry, score, pickup, materials_accepted, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type, address, lat, lng, distance_km, rate_offered, auth_status, auth_expiry, score, pickup, materials_accepted, active, now, now);
    
    db.prepare('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details, created_at) VALUES (?,?,?,?,?,?)')
      .run('buyer', id, 'create', req.user.id, JSON.stringify({ name, type }), now);
      
    const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(id);
    res.json(buyer);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/buyers/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, type, address, lat, lng, distance_km, rate_offered, auth_status, auth_expiry, score, pickup, materials_accepted, active } = req.body;
    const now = new Date().toISOString();
    
    db.prepare(`
      UPDATE buyers SET 
        name = coalesce(?, name), type = coalesce(?, type), address = coalesce(?, address),
        lat = coalesce(?, lat), lng = coalesce(?, lng), distance_km = coalesce(?, distance_km),
        rate_offered = coalesce(?, rate_offered), auth_status = coalesce(?, auth_status),
        auth_expiry = coalesce(?, auth_expiry), score = coalesce(?, score), pickup = coalesce(?, pickup),
        materials_accepted = coalesce(?, materials_accepted), active = coalesce(?, active),
        updated_at = ?
      WHERE id = ?
    `).run(name, type, address, lat, lng, distance_km, rate_offered, auth_status, auth_expiry, score, pickup, materials_accepted, active, now, req.params.id);
    
    db.prepare('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details, created_at) VALUES (?,?,?,?,?,?)')
      .run('buyer', req.params.id, 'update', req.user.id, JSON.stringify(req.body), now);
      
    const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(req.params.id);
    res.json(buyer);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
