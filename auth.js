const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { signToken, authenticate } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'collector', phone = '' } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Missing required fields' });
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    
    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);
    const collector_id = 'COL-' + Math.floor(1000 + Math.random() * 9000).toString();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, phone, collector_id, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, email, password_hash, name, role, phone, collector_id, now, now);
    
    db.prepare('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details, created_at) VALUES (?,?,?,?,?,?)')
      .run('user', id, 'register', id, JSON.stringify({ role }), now);
      
    const user = db.prepare('SELECT id, email, name, role, phone, preferred_language, collector_id FROM users WHERE id = ?').get(id);
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    delete user.password_hash;
    const token = signToken(user);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, name, role, phone, preferred_language, collector_id FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile', authenticate, (req, res) => {
  try {
    const { name, phone, preferred_language } = req.body;
    const now = new Date().toISOString();
    
    db.prepare(`
      UPDATE users SET name = coalesce(?, name), phone = coalesce(?, phone), 
      preferred_language = coalesce(?, preferred_language), updated_at = ? WHERE id = ?
    `).run(name, phone, preferred_language, now, req.user.id);
    
    const user = db.prepare('SELECT id, email, name, role, phone, preferred_language, collector_id FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
