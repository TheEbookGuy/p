// Database configuration and initialization
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', 'urban_mining.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Database ready promise
const ready = new Promise((resolve, reject) => {
  db.serialize(() => {
    // Check if tables exist, if not initialize schema
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) reject(err);
      if (!tables || tables.length === 0) {
        // Load and run schema
        const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8');
        db.exec(schema, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  });
});

// Utility methods
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

module.exports = {
  db,
  ready,
  dbRun,
  dbGet,
  dbAll
};
