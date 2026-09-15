// config/db.js — SQLite database connection using sql.js (pure JS, no native deps)
//
// sql.js has an async init but sync query API. We use a synchronous-compatible
// wrapper so all route handlers can use db.prepare(sql).run/get/all() just like
// better-sqlite3.
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'urban_mining.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let _db = null;   // raw sql.js Database instance
let _ready = null; // promise that resolves when DB is ready

function normalizeParams(params) {
  if (params.length === 1 && Array.isArray(params[0])) {
    params = params[0];
  }
  return params.map(p => (p === undefined ? null : p));
}

let _inTransaction = false;

// ── Wrapper that mimics better-sqlite3 API ──
const wrapper = {
  /** Prepare a statement and return an object with run/get/all methods */
  prepare(sql) {
    return {
      run(...params) {
        const cleanParams = normalizeParams(params);
        _db.run(sql, cleanParams);
        const info = _db.exec("SELECT last_insert_rowid() AS lid, changes() AS ch");
        const lastInsertRowid = info.length ? info[0].values[0][0] : 0;
        const changes = info.length ? info[0].values[0][1] : 0;
        if (!_inTransaction) {
          _save();
        }
        return { lastInsertRowid, changes };
      },
      get(...params) {
        const stmt = _db.prepare(sql);
        stmt.bind(normalizeParams(params));
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const stmt = _db.prepare(sql);
        stmt.bind(normalizeParams(params));
        const cols = stmt.getColumnNames();
        const rows = [];
        while (stmt.step()) {
          const vals = stmt.get();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          rows.push(row);
        }
        stmt.free();
        return rows;
      }
    };
  },
  /** Execute raw SQL (multiple statements) */
  exec(sql) {
    _db.run(sql);
    if (!_inTransaction) {
      _save();
    }
  },
  /** Run a function inside a transaction */
  transaction(fn) {
    return (...args) => {
      _inTransaction = true;
      try {
        const result = fn(...args);
        _inTransaction = false;
        _save();
        return result;
      } catch (err) {
        _inTransaction = false;
        throw err;
      }
    };
  },
  /** Pragma helper */
  pragma(sql) {
    try { _db.exec('PRAGMA ' + sql); } catch(e) { /* ignore */ }
  },
  /** Close database */
  close() {
    if (_db) {
      _save();
      _db.close();
      _db = null;
    }
  },
  /** Promise that resolves when DB is ready */
  get ready() { return _ready; }
};

function _save() {
  if (!_db) return;
  try {
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

// ── Initialize ──
_ready = (async () => {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }
  // Enable foreign keys
  try { _db.run('PRAGMA foreign_keys = ON'); } catch(e) {}

  // Initialize schema
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    try {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      _db.exec(schema);
      _save();
    } catch (err) {
      // Tables already exist — that's fine
      if (!err.message.includes('already exists')) {
        console.error('Schema error:', err.message);
      }
    }
  }
  console.log('  ✓ Database ready');
})();

module.exports = wrapper;
