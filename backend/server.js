// ── Urban Mining Connect — Express Server ──
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { db, ready } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// Serve uploaded files
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── Health check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── API Routes ──
app.use('/api/auth',      authLimiter, require('./routes/auth'));
app.use('/api/materials',              require('./routes/materials'));
app.use('/api/prices',                 require('./routes/prices'));
app.use('/api/lots',                   require('./routes/lots'));
app.use('/api/buyers',                 require('./routes/buyers'));
app.use('/api/handover',               require('./routes/handover'));
app.use('/api/earnings',               require('./routes/earnings'));
app.use('/api/dashboard',              require('./routes/dashboard'));
app.use('/api/recovery',               require('./routes/recovery'));
app.use('/api/admin',                  require('./routes/admin'));
app.use('/api/upload',                 require('./routes/upload'));

// ── Serve frontend ──
app.use(express.static(path.join(__dirname, '..')));

// ── Global error handler ──
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start (wait for DB to be ready) ──
async function start() {
  await ready;
  app.listen(PORT, () => {
    console.log(`\n  ♻  Urban Mining Connect API`);
    console.log(`     http://localhost:${PORT}`);
    console.log(`     http://localhost:${PORT}/api/health`);
    console.log(`     Frontend: http://localhost:${PORT}/index.html\n`);
  });
}
start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

module.exports = app;
