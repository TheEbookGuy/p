// ── Urban Mining Connect — API Smoke Tests ──
// Run with:  npm test   (or node tests/api.test.js)
//
// These tests hit the live API on localhost:3000.
// Prerequisites: seed the database first (npm run seed), then start the server.
// ─────────────────────────────────────────────────────────────

const BASE = process.env.TEST_BASE || 'http://localhost:3000/api';
let passed = 0;
let failed = 0;
let collectorToken = '';
let adminToken = '';
let createdLotId = '';

async function request(path, opts = {}) {
  const url = BASE + path;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(url, { ...opts, headers });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function authed(path, token, opts = {}) {
  opts.headers = { ...(opts.headers || {}), Authorization: 'Bearer ' + token };
  return request(path, opts);
}

function assert(name, condition) {
  if (condition) { passed++; console.log(`  ✓ ${name}`); }
  else           { failed++; console.error(`  ✗ ${name}`); }
}

// ── Test suites ──

async function testHealth() {
  console.log('\n── Health ──');
  const { status, body } = await request('/health');
  assert('GET /health returns 200', status === 200);
  assert('status is ok', body && body.status === 'ok');
}

async function testAuth() {
  console.log('\n── Authentication ──');

  // Register
  const reg = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: 'test-' + Date.now() + '@test.com', password: 'test1234', name: 'Test User' })
  });
  assert('POST /auth/register returns 201', reg.status === 201);
  assert('register returns token', reg.body && reg.body.token);

  // Login as collector
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'collector@urbanmine.in', password: 'collector123' })
  });
  assert('POST /auth/login returns 200', login.status === 200);
  assert('login returns token', login.body && login.body.token);
  collectorToken = login.body ? login.body.token : '';

  // Login as admin
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@urbanmine.in', password: 'admin123' })
  });
  assert('admin login returns 200', adminLogin.status === 200);
  adminToken = adminLogin.body ? adminLogin.body.token : '';

  // Me
  const me = await authed('/auth/me', collectorToken);
  assert('GET /auth/me returns 200', me.status === 200);
  assert('me returns collector role', me.body && me.body.role === 'collector');

  // Unauthorized
  const noAuth = await request('/auth/me');
  assert('GET /auth/me without token returns 401', noAuth.status === 401);
}

async function testMaterials() {
  console.log('\n── Materials ──');
  const { status, body } = await request('/materials');
  assert('GET /materials returns 200', status === 200);
  assert('returns array of materials', Array.isArray(body) && body.length >= 12);
  assert('material has rate field', body[0] && typeof body[0].rate === 'number');
}

async function testLots() {
  console.log('\n── Lots ──');

  // Create lot
  const create = await authed('/lots', collectorToken, {
    method: 'POST',
    body: JSON.stringify({ material_id: 'copper', weight: 5.5 })
  });
  assert('POST /lots returns 201', create.status === 201);
  assert('lot has id', create.body && create.body.id);
  createdLotId = create.body ? create.body.id : '';

  // List lots
  const list = await authed('/lots', collectorToken);
  assert('GET /lots returns 200', list.status === 200);
  assert('returns array', Array.isArray(list.body));

  // Get single lot
  if (createdLotId) {
    const single = await authed('/lots/' + createdLotId, collectorToken);
    assert('GET /lots/:id returns 200', single.status === 200);
    assert('lot status is created', single.body && single.body.status === 'created');
  }

  // Get trail
  if (createdLotId) {
    const trail = await authed('/lots/' + createdLotId + '/trail', collectorToken);
    assert('GET /lots/:id/trail returns 200', trail.status === 200);
  }
}

async function testBuyerMatching() {
  console.log('\n── Buyer Matching ──');
  const { status, body } = await request('/buyers');
  assert('GET /buyers returns 200', status === 200);
  assert('returns buyer array', Array.isArray(body));

  // Match for a lot
  if (createdLotId) {
    const matches = await authed('/lots/' + createdLotId + '/matches', collectorToken);
    assert('GET /lots/:id/matches returns 200', matches.status === 200);
    assert('returns matches array', Array.isArray(matches.body));
  }
}

async function testHandover() {
  console.log('\n── Handover ──');
  // Use a seeded lot for handover test
  const buyers = await request('/buyers');
  if (buyers.body && buyers.body.length > 0 && createdLotId) {
    // First select a buyer
    await authed('/lots/' + createdLotId + '/select-buyer', collectorToken, {
      method: 'POST',
      body: JSON.stringify({ buyer_id: buyers.body[0].id })
    });

    const ho = await authed('/handover', collectorToken, {
      method: 'POST',
      body: JSON.stringify({
        lot_id: createdLotId,
        buyer_id: buyers.body[0].id,
        weight_verified: 5.5,
        notes: 'Test handover'
      })
    });
    assert('POST /handover returns 201', ho.status === 201);
    assert('handover has verification_ref', ho.body && ho.body.handover && ho.body.handover.verification_ref);
  }
}

async function testEarnings() {
  console.log('\n── Earnings ──');
  const list = await authed('/earnings', collectorToken);
  assert('GET /earnings returns 200', list.status === 200);

  const summary = await authed('/earnings/summary', collectorToken);
  assert('GET /earnings/summary returns 200', summary.status === 200);
  assert('summary has total_earned', summary.body && typeof summary.body.total_earned === 'number');
}

async function testDashboard() {
  console.log('\n── Dashboard ──');
  const { status, body } = await authed('/dashboard', collectorToken);
  assert('GET /dashboard returns 200', status === 200);
  assert('has active_lots field', body && typeof body.active_lots === 'number');
}

async function testRecovery() {
  console.log('\n── Recovery ──');
  const { status, body } = await authed('/recovery/stats', collectorToken);
  assert('GET /recovery/stats returns 200', status === 200);
  assert('has total_captured_kg', body && typeof body.total_captured_kg === 'number');
}

async function testAdmin() {
  console.log('\n── Admin ──');
  const users = await authed('/admin/users', adminToken);
  assert('GET /admin/users returns 200', users.status === 200);

  const stats = await authed('/admin/stats', adminToken);
  assert('GET /admin/stats returns 200', stats.status === 200);

  // Collector should be denied
  const denied = await authed('/admin/users', collectorToken);
  assert('collector cannot access admin (403)', denied.status === 403);
}

// ── Runner ──
async function run() {
  console.log('═══ Urban Mining Connect — API Smoke Tests ═══');
  console.log(`Target: ${BASE}\n`);

  try {
    await testHealth();
    await testAuth();
    await testMaterials();
    await testLots();
    await testBuyerMatching();
    await testHandover();
    await testEarnings();
    await testDashboard();
    await testRecovery();
    await testAdmin();
  } catch (err) {
    console.error('\n  ⚠ Test runner error:', err.message);
    failed++;
  }

  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
