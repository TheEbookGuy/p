// ── Urban Mining Connect — Database Seed Script ──
// Run with:  node db/seed.js
//
// Creates all tables (via schema.sql) and inserts realistic demo data.
// ─────────────────────────────────────────────────────────────

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const initSqlJs = require('sql.js');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'urban_mining.db');

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Remove old DB for a clean seed
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('  ✓ Removed old database');
}

async function seed() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  function run(sql, params = []) {
    db.run(sql, params);
  }

  function saveToDisk() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  // ── 1. Create schema ──
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  console.log('  ✓ Schema created');

  // ── 2. Seed materials ──
  const materialsData = [
    { id: 'iron',       group_name: 'Ferrous',            name: 'Iron',                        icon: '🔩' },
    { id: 'steel',      group_name: 'Ferrous',            name: 'Steel',                       icon: '🏗️' },
    { id: 'aluminium',  group_name: 'Non-Ferrous',        name: 'Aluminium',                   icon: '🥫' },
    { id: 'copper',     group_name: 'Non-Ferrous',        name: 'Copper',                      icon: '🟠' },
    { id: 'brass',      group_name: 'Non-Ferrous',        name: 'Brass',                       icon: '🟡' },
    { id: 'lithium',    group_name: 'Critical Minerals',  name: 'Lithium-bearing battery',     icon: '🔋' },
    { id: 'magnet',     group_name: 'Critical Minerals',  name: 'Magnet / rare-earth bearing', icon: '🧲' },
    { id: 'pcb',        group_name: 'E-Waste',            name: 'PCB',                         icon: '🟩' },
    { id: 'cable',      group_name: 'E-Waste',            name: 'Copper cable & wire',         icon: '🔌' },
    { id: 'panel',      group_name: 'E-Waste',            name: 'LCD / LED panel',             icon: '🖥️' },
    { id: 'battery',    group_name: 'E-Waste',            name: 'Battery',                     icon: '🔋' },
    { id: 'mixedmetal', group_name: 'Mixed Scrap',        name: 'Mixed metal',                 icon: '🧰' }
  ];
  for (const m of materialsData) {
    run('INSERT INTO materials (id, group_name, name, icon) VALUES (?, ?, ?, ?)', [m.id, m.group_name, m.name, m.icon]);
  }
  console.log(`  ✓ ${materialsData.length} materials seeded`);

  // ── 3. Seed prices ──
  const pricesData = [
    { material_id: 'iron',       rate: 38,  trend: 'up',   delta: '+₹2' },
    { material_id: 'steel',      rate: 42,  trend: 'flat', delta: 'steady' },
    { material_id: 'aluminium',  rate: 155, trend: 'up',   delta: '+₹5' },
    { material_id: 'copper',     rate: 690, trend: 'up',   delta: '+₹12' },
    { material_id: 'brass',      rate: 510, trend: 'flat', delta: 'steady' },
    { material_id: 'lithium',    rate: 125, trend: 'up',   delta: '+₹4' },
    { material_id: 'magnet',     rate: 180, trend: 'flat', delta: 'indicative' },
    { material_id: 'pcb',        rate: 310, trend: 'up',   delta: '+₹8' },
    { material_id: 'cable',      rate: 265, trend: 'up',   delta: '+₹6' },
    { material_id: 'panel',      rate: 72,  trend: 'flat', delta: 'steady' },
    { material_id: 'battery',    rate: 92,  trend: 'down', delta: '−₹3' },
    { material_id: 'mixedmetal', rate: 55,  trend: 'flat', delta: 'steady' }
  ];
  for (const p of pricesData) {
    run('INSERT INTO prices (material_id, rate, trend, delta) VALUES (?, ?, ?, ?)', [p.material_id, p.rate, p.trend, p.delta]);
  }
  console.log(`  ✓ ${pricesData.length} prices seeded`);

  // ── 4. Seed users ──
  const salt = bcrypt.genSaltSync(10);
  const adminId = uuid();
  const collectorId = uuid();
  const buyerUserId = uuid();

  const usersData = [
    { id: adminId,      email: 'admin@urbanmine.in',     password_hash: bcrypt.hashSync('admin123', salt),     name: 'Admin User',       role: 'admin',     phone: '+91-9000000001', collector_id: null },
    { id: collectorId,  email: 'collector@urbanmine.in', password_hash: bcrypt.hashSync('collector123', salt), name: 'Collector Demo',   role: 'collector', phone: '+91-9000000002', collector_id: 'COL-1048' },
    { id: buyerUserId,  email: 'buyer@urbanmine.in',     password_hash: bcrypt.hashSync('buyer123', salt),     name: 'GreenLoop Operator', role: 'buyer',   phone: '+91-9000000003', collector_id: null }
  ];
  for (const u of usersData) {
    run('INSERT INTO users (id, email, password_hash, name, role, phone, collector_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.email, u.password_hash, u.name, u.role, u.phone, u.collector_id]);
  }
  console.log(`  ✓ ${usersData.length} users seeded`);

  // ── 5. Seed buyers/facilities ──
  const buyer1Id = uuid(), buyer2Id = uuid(), buyer3Id = uuid(), buyer4Id = uuid();
  const buyersData = [
    { id: buyer1Id, user_id: buyerUserId, name: 'GreenLoop Materials', type: 'Authorized Recycler', address: 'Plot 12, MIDC Taloja', lat: 19.064, lng: 73.108, distance_km: 8, rate_offered: 320, auth_status: 'Authorization verified', auth_expiry: '2027-02-28', score: 96, pickup: 1, materials_accepted: 'pcb,cable,panel,battery', active: 1 },
    { id: buyer2Id, user_id: null, name: 'Shakti Metal Recovery', type: 'Authorized Processor', address: 'Survey 45, Bhiwandi', lat: 19.305, lng: 73.063, distance_km: 12, rate_offered: 48, auth_status: 'Authorization verified', auth_expiry: '2027-06-30', score: 92, pickup: 1, materials_accepted: 'iron,steel,aluminium,mixedmetal', active: 1 },
    { id: buyer3Id, user_id: null, name: 'UrbanMet Secondarys', type: 'Aggregator', address: 'Dharavi Recycling Cluster', lat: 19.043, lng: 72.855, distance_km: 5, rate_offered: 44, auth_status: 'Registration verified', auth_expiry: '2027-01-15', score: 88, pickup: 0, materials_accepted: 'iron,steel,mixedmetal', active: 1 },
    { id: buyer4Id, user_id: null, name: 'Circular Minerals Hub', type: 'Authorized Processor', address: 'Industrial Area, Pune', lat: 18.563, lng: 73.916, distance_km: 21, rate_offered: 710, auth_status: 'Authorization verified', auth_expiry: '2027-09-30', score: 94, pickup: 1, materials_accepted: 'copper,brass,lithium,magnet', active: 1 }
  ];
  for (const b of buyersData) {
    run('INSERT INTO buyers (id, user_id, name, type, address, lat, lng, distance_km, rate_offered, auth_status, auth_expiry, score, pickup, materials_accepted, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [b.id, b.user_id, b.name, b.type, b.address, b.lat, b.lng, b.distance_km, b.rate_offered, b.auth_status, b.auth_expiry, b.score, b.pickup, b.materials_accepted, b.active]);
  }
  console.log(`  ✓ ${buyersData.length} buyers/facilities seeded`);

  // ── 6. Seed sample lots ──
  const lot1Id = 'UM-7F2A91', lot2Id = 'UM-92CD10', lot3Id = 'UM-3AB811', lot4Id = 'UM-D4E5F6';
  const lotsData = [
    { id: lot1Id, collector_id: collectorId, material_id: 'cable',  weight: 12.4, estimated_value: 12.4*265, status: 'completed' },
    { id: lot2Id, collector_id: collectorId, material_id: 'steel',  weight: 31,   estimated_value: 31*42,    status: 'completed' },
    { id: lot3Id, collector_id: collectorId, material_id: 'pcb',    weight: 5.8,  estimated_value: 5.8*310,  status: 'handed_over' },
    { id: lot4Id, collector_id: collectorId, material_id: 'copper', weight: 8.2,  estimated_value: 8.2*690,  status: 'created' }
  ];
  for (const l of lotsData) {
    run('INSERT INTO lots (id, collector_id, material_id, weight, estimated_value, status) VALUES (?,?,?,?,?,?)',
      [l.id, l.collector_id, l.material_id, l.weight, l.estimated_value, l.status]);
  }
  console.log(`  ✓ ${lotsData.length} lots seeded`);

  // ── 7. Seed buyer matches ──
  const matchesData = [
    { lot_id: lot1Id, buyer_id: buyer1Id, match_score: 95, rank: 1, selected: 1 },
    { lot_id: lot1Id, buyer_id: buyer4Id, match_score: 82, rank: 2, selected: 0 },
    { lot_id: lot2Id, buyer_id: buyer2Id, match_score: 93, rank: 1, selected: 1 },
    { lot_id: lot2Id, buyer_id: buyer3Id, match_score: 85, rank: 2, selected: 0 },
    { lot_id: lot3Id, buyer_id: buyer1Id, match_score: 91, rank: 1, selected: 1 }
  ];
  for (const m of matchesData) {
    run('INSERT INTO buyer_matches (lot_id, buyer_id, match_score, rank, selected) VALUES (?,?,?,?,?)',
      [m.lot_id, m.buyer_id, m.match_score, m.rank, m.selected]);
  }
  console.log(`  ✓ ${matchesData.length} buyer matches seeded`);

  // ── 8. Seed handover events ──
  const handoverData = [
    { lot_id: lot1Id, collector_id: collectorId, buyer_id: buyer1Id, weight_verified: 12.4, status: 'confirmed', verification_ref: 'HV-A1B2C3', notes: 'Material in good condition' },
    { lot_id: lot2Id, collector_id: collectorId, buyer_id: buyer2Id, weight_verified: 31,   status: 'confirmed', verification_ref: 'HV-D4E5F6', notes: 'Steel sorted and clean' },
    { lot_id: lot3Id, collector_id: collectorId, buyer_id: buyer1Id, weight_verified: 5.8,  status: 'confirmed', verification_ref: 'HV-G7H8I9', notes: 'PCB boards — pending payment' }
  ];
  for (const h of handoverData) {
    run('INSERT INTO handover_events (lot_id, collector_id, buyer_id, weight_verified, status, verification_ref, notes) VALUES (?,?,?,?,?,?,?)',
      [h.lot_id, h.collector_id, h.buyer_id, h.weight_verified, h.status, h.verification_ref, h.notes]);
  }
  console.log(`  ✓ ${handoverData.length} handover events seeded`);

  // ── 9. Seed transactions ──
  const txData = [
    { lot_id: lot1Id, collector_id: collectorId, buyer_id: buyer1Id, material_id: 'cable', weight: 12.4, rate: 265, total_amount: 12.4*265, payment_status: 'paid', paid_at: '2026-09-15T10:30:00' },
    { lot_id: lot2Id, collector_id: collectorId, buyer_id: buyer2Id, material_id: 'steel', weight: 31,   rate: 42,  total_amount: 31*42,    payment_status: 'paid', paid_at: '2026-09-14T14:00:00' },
    { lot_id: lot3Id, collector_id: collectorId, buyer_id: buyer1Id, material_id: 'pcb',   weight: 5.8,  rate: 310, total_amount: 5.8*310,  payment_status: 'pending', paid_at: null }
  ];
  for (const t of txData) {
    run('INSERT INTO transactions (lot_id, collector_id, buyer_id, material_id, weight, rate, total_amount, payment_status, paid_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [t.lot_id, t.collector_id, t.buyer_id, t.material_id, t.weight, t.rate, t.total_amount, t.payment_status, t.paid_at]);
  }
  console.log(`  ✓ ${txData.length} transactions seeded`);

  // ── 10. Seed audit log ──
  const auditData = [
    { entity_type: 'lot', entity_id: lot1Id, action: 'created',        actor_id: collectorId, details: '{"material":"cable","weight":12.4}' },
    { entity_type: 'lot', entity_id: lot1Id, action: 'matched',        actor_id: collectorId, details: '{"buyers_found":2}' },
    { entity_type: 'lot', entity_id: lot1Id, action: 'buyer_selected', actor_id: collectorId, details: '{"buyer":"GreenLoop Materials"}' },
    { entity_type: 'lot', entity_id: lot1Id, action: 'handed_over',    actor_id: collectorId, details: '{"ref":"HV-A1B2C3","weight_verified":12.4}' },
    { entity_type: 'lot', entity_id: lot1Id, action: 'completed',      actor_id: collectorId, details: '{"payment":"paid","amount":3286}' },
    { entity_type: 'lot', entity_id: lot2Id, action: 'created',        actor_id: collectorId, details: '{"material":"steel","weight":31}' },
    { entity_type: 'lot', entity_id: lot2Id, action: 'completed',      actor_id: collectorId, details: '{"payment":"paid","amount":1302}' },
    { entity_type: 'lot', entity_id: lot3Id, action: 'created',        actor_id: collectorId, details: '{"material":"pcb","weight":5.8}' },
    { entity_type: 'lot', entity_id: lot3Id, action: 'handed_over',    actor_id: collectorId, details: '{"ref":"HV-G7H8I9","payment":"pending"}' },
    { entity_type: 'lot', entity_id: lot4Id, action: 'created',        actor_id: collectorId, details: '{"material":"copper","weight":8.2}' }
  ];
  for (const a of auditData) {
    run('INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details) VALUES (?,?,?,?,?)',
      [a.entity_type, a.entity_id, a.action, a.actor_id, a.details]);
  }
  console.log(`  ✓ ${auditData.length} audit log entries seeded`);

  // Save to disk
  saveToDisk();
  db.close();

  console.log('\n  ✅ Database seeded successfully!');
  console.log(`  📁 ${DB_PATH}\n`);
  console.log('  Demo credentials:');
  console.log('    Admin:     admin@urbanmine.in     / admin123');
  console.log('    Collector: collector@urbanmine.in  / collector123');
  console.log('    Buyer:     buyer@urbanmine.in      / buyer123\n');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
