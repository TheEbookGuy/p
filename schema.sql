-- ── Urban Mining Connect — Database Schema (SQLite) ──

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'collector'
                  CHECK(role IN ('collector','buyer','admin')),
  phone         TEXT,
  preferred_language TEXT DEFAULT 'Hindi',
  collector_id  TEXT UNIQUE,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS materials (
  id          TEXT PRIMARY KEY,
  group_name  TEXT NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT,
  unit        TEXT DEFAULT 'kg',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prices (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id    TEXT NOT NULL REFERENCES materials(id),
  rate           REAL NOT NULL,
  trend          TEXT DEFAULT 'flat',
  delta          TEXT DEFAULT 'steady',
  effective_from TEXT DEFAULT (datetime('now')),
  updated_by     TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS lots (
  id              TEXT PRIMARY KEY,
  collector_id    TEXT NOT NULL REFERENCES users(id),
  material_id     TEXT NOT NULL REFERENCES materials(id),
  weight          REAL NOT NULL,
  estimated_value REAL,
  photo_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'created'
                    CHECK(status IN ('created','matched','buyer_selected',
                          'handover_pending','handed_over','completed')),
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS buyers (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT REFERENCES users(id),
  name               TEXT NOT NULL,
  type               TEXT,
  address            TEXT,
  lat                REAL,
  lng                REAL,
  distance_km        REAL,
  rate_offered       REAL,
  auth_status        TEXT DEFAULT 'pending',
  auth_expiry        TEXT,
  score              INTEGER DEFAULT 80,
  pickup             INTEGER DEFAULT 0,
  materials_accepted TEXT,          -- comma-separated material ids
  active             INTEGER DEFAULT 1,
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS buyer_matches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id      TEXT NOT NULL REFERENCES lots(id),
  buyer_id    TEXT NOT NULL REFERENCES buyers(id),
  match_score REAL,
  rank        INTEGER,
  selected    INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS handover_events (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id           TEXT NOT NULL REFERENCES lots(id),
  collector_id     TEXT NOT NULL REFERENCES users(id),
  buyer_id         TEXT NOT NULL REFERENCES buyers(id),
  weight_verified  REAL,
  status           TEXT DEFAULT 'confirmed',
  verification_ref TEXT,
  location_lat     REAL,
  location_lng     REAL,
  notes            TEXT,
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id          TEXT NOT NULL REFERENCES lots(id),
  collector_id    TEXT NOT NULL REFERENCES users(id),
  buyer_id        TEXT NOT NULL REFERENCES buyers(id),
  material_id     TEXT NOT NULL REFERENCES materials(id),
  weight          REAL NOT NULL,
  rate            REAL NOT NULL,
  total_amount    REAL NOT NULL,
  payment_status  TEXT DEFAULT 'pending'
                    CHECK(payment_status IN ('pending','paid','failed')),
  paid_at         TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  action      TEXT NOT NULL,
  actor_id    TEXT,
  details     TEXT,               -- JSON string
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_prices_material   ON prices(material_id);
CREATE INDEX IF NOT EXISTS idx_lots_collector     ON lots(collector_id);
CREATE INDEX IF NOT EXISTS idx_lots_status        ON lots(status);
CREATE INDEX IF NOT EXISTS idx_buyer_matches_lot  ON buyer_matches(lot_id);
CREATE INDEX IF NOT EXISTS idx_handover_lot       ON handover_events(lot_id);
CREATE INDEX IF NOT EXISTS idx_transactions_collector ON transactions(collector_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity       ON audit_log(entity_type, entity_id);
