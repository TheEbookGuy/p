// ── Urban Mining Connect — End-to-End User Flow Verification ──
// Tests the full lifecycle across both frontend HTTP endpoints and backend APIs.

const BASE = 'http://localhost:3000';
let passed = 0;
let failed = 0;

function assert(name, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name} ${extra}`);
  }
}

async function runE2E() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('   Urban Mining Connect — End-to-End Flow Verification');
  console.log('════════════════════════════════════════════════════════\n');

  // ── Step 1: Public Web Pages & Initial Data Loads ──
  console.log('── Step 1: Public Pages & Initial Data Loads ──');
  const indexHtml = await (await fetch(`${BASE}/index.html`)).text();
  assert('GET /index.html loads successfully', indexHtml.includes('Urban Mining Connect'));

  const publicDash = await (await fetch(`${BASE}/api/dashboard`)).json();
  assert('GET /api/dashboard accessible without auth', typeof publicDash.total_recovered_kg === 'number');

  const publicMats = await (await fetch(`${BASE}/api/materials`)).json();
  assert('GET /api/materials returns all 12 streams', Array.isArray(publicMats) && publicMats.length === 12);

  const publicPrices = await (await fetch(`${BASE}/api/prices`)).json();
  assert('GET /api/prices returns pricing array', Array.isArray(publicPrices) && publicPrices.length >= 12);

  const publicRecovery = await (await fetch(`${BASE}/api/recovery/stats`)).json();
  assert('GET /api/recovery/stats returns stream breakdown', Array.isArray(publicRecovery.by_stream));

  // ── Step 2: User Registration Flow ──
  console.log('\n── Step 2: Collector Registration Flow ──');
  const uniqueEmail = `collector_${Date.now()}@urbanmine.in`;
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'password123',
      name: 'Ramesh Patel',
      role: 'collector',
      phone: '+91 98765 43210'
    })
  });
  assert('POST /api/auth/register returns 201', regRes.status === 201);
  const regData = await regRes.json();
  assert('Registration generates JWT token', Boolean(regData.token));
  assert('Registration generates collector ID', regData.user && regData.user.collector_id.startsWith('COL-'));
  const userToken = regData.token;

  // ── Step 3: User Login & Profile Flow ──
  console.log('\n── Step 3: User Login & Profile Flow ──');
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password: 'password123' })
  });
  assert('POST /api/auth/login returns 200', loginRes.status === 200);
  const loginData = await loginRes.json();
  assert('Login returns valid token', Boolean(loginData.token));

  const meRes = await fetch(`${BASE}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const meData = await meRes.json();
  assert('GET /api/auth/me returns collector details', meData.name === 'Ramesh Patel' && meData.role === 'collector');

  // Update profile
  const profileRes = await fetch(`${BASE}/api/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ preferred_language: 'Marathi', phone: '+91 99999 88888' })
  });
  const profileData = await profileRes.json();
  assert('PUT /api/auth/profile updates language & phone', profileData.preferred_language === 'Marathi' && profileData.phone === '+91 99999 88888');

  // ── Step 4: Photo Upload & Material Capture Flow ──
  console.log('\n── Step 4: Material Capture & Lot Creation Flow ──');
  // Create dummy image buffer
  const dummySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#087f5b" width="100" height="100"/></svg>';
  const formData = new FormData();
  formData.append('photo', new Blob([dummySvg], { type: 'image/svg+xml' }), 'copper_cable.svg');

  const uploadRes = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userToken}` },
    body: formData
  });
  assert('POST /api/upload returns 200 for photo', uploadRes.status === 200);
  const uploadData = await uploadRes.json();
  assert('Upload returns valid file URL', uploadData.url && uploadData.url.startsWith('/uploads/'));

  // Create lot
  const lotRes = await fetch(`${BASE}/api/lots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      material_id: 'copper',
      weight: 15.5,
      photo_url: uploadData.url
    })
  });
  assert('POST /api/lots returns 201', lotRes.status === 201);
  const lotData = await lotRes.json();
  assert('Lot ID starts with UM-', lotData.id && lotData.id.startsWith('UM-'));
  assert('Estimated value calculated correctly', lotData.estimated_value > 0);
  assert('Lot status is initially "created"', lotData.status === 'created');
  const lotId = lotData.id;

  // ── Step 5: Buyer Matching Flow ──
  console.log('\n── Step 5: Algorithmic Buyer Matching Flow ──');
  const matchesRes = await fetch(`${BASE}/api/lots/${lotId}/matches`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  assert('GET /api/lots/:id/matches returns 200', matchesRes.status === 200);
  const matchesData = await matchesRes.json();
  assert('Returns ranked buyer matches', Array.isArray(matchesData) && matchesData.length > 0);
  assert('Matches contain rank and score', matchesData[0].rank === 1 && typeof matchesData[0].match_score === 'number');

  const selectedBuyer = matchesData[0];
  const selectRes = await fetch(`${BASE}/api/lots/${lotId}/select-buyer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ buyer_id: selectedBuyer.buyer_id })
  });
  assert('POST /api/lots/:id/select-buyer returns 200', selectRes.status === 200);
  const selectData = await selectRes.json();
  assert('Lot status updated to "buyer_selected"', selectData.status === 'buyer_selected');

  // Verify lot details endpoint returns buyer information
  const lotDetailRes = await fetch(`${BASE}/api/lots/${lotId}`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const lotDetail = await lotDetailRes.json();
  assert('GET /api/lots/:id enriches buyer info', lotDetail.buyer_id === selectedBuyer.buyer_id);

  // ── Step 6: Handover & Chain of Custody Flow ──
  console.log('\n── Step 6: Custody Handover Verification Flow ──');
  const handoverRes = await fetch(`${BASE}/api/handover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      lot_id: lotId,
      buyer_id: selectedBuyer.buyer_id,
      weight_verified: 15.5,
      notes: 'Handover verified at facility gate'
    })
  });
  assert('POST /api/handover returns 201', handoverRes.status === 201);
  const handoverData = await handoverRes.json();
  assert('Handover has verification ref (HV-)', Boolean(handoverData.handover && handoverData.handover.verification_ref.startsWith('HV-')));
  assert('Transaction created with pending payment', Boolean(handoverData.transaction && handoverData.transaction.total_amount > 0));

  // Check audit trail
  const trailRes = await fetch(`${BASE}/api/lots/${lotId}/trail`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const trailData = await trailRes.json();
  assert('Audit trail records lifecycle events', Array.isArray(trailData) && trailData.length >= 3);
  assert('Audit trail contains created, matched, buyer_selected, handover',
    trailData.some(e => e.action === 'create' || e.action === 'created') &&
    trailData.some(e => e.action === 'matched') &&
    trailData.some(e => e.action === 'buyer_selected')
  );

  // ── Step 7: Collector Ledger & Earnings Flow ──
  console.log('\n── Step 7: Collector Ledger & Earnings Flow ──');
  const earningsRes = await fetch(`${BASE}/api/earnings`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const earningsData = await earningsRes.json();
  assert('GET /api/earnings lists collector transactions', Array.isArray(earningsData) && earningsData.length >= 1);
  assert('Transaction reflects verified weight and material', earningsData[0].weight === 15.5);

  const earningsSumRes = await fetch(`${BASE}/api/earnings/summary`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const earningsSum = await earningsSumRes.json();
  assert('GET /api/earnings/summary reflects pending payout', earningsSum.pending > 0);

  // ── Step 8: Dashboard Metrics Flow ──
  console.log('\n── Step 8: Dashboard Live Metrics Flow ──');
  const authDashRes = await fetch(`${BASE}/api/dashboard`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const authDash = await authDashRes.json();
  assert('Collector dashboard shows active lots', authDash.active_lots >= 1);

  // ── Step 9: Recovery Intelligence Flow ──
  console.log('\n── Step 9: Recovery Intelligence Flow ──');
  const recRes = await fetch(`${BASE}/api/recovery/stats`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const recStats = await recRes.json();
  assert('Recovery stats count newly captured lot', recStats.lots_captured >= 5);
  assert('Recovery stats include copper in by_stream breakdown',
    recStats.by_stream.some(s => s.group_name === 'Non-Ferrous')
  );

  // ── Step 10: Admin & Facility Partner Console Flow ──
  console.log('\n── Step 10: Partner / Admin Console Flow ──');
  const adminLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@urbanmine.in', password: 'admin123' })
  });
  const adminAuth = await adminLogin.json();
  const adminToken = adminAuth.token;

  const adminStatsRes = await fetch(`${BASE}/api/admin/stats`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminStats = await adminStatsRes.json();
  assert('Admin stats return total users and lots', adminStats.total_users >= 3 && adminStats.total_lots >= 5);

  const adminLotsRes = await fetch(`${BASE}/api/admin/lots`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminLots = await adminLotsRes.json();
  assert('Admin lots queue lists all captured lots', Array.isArray(adminLots) && adminLots.length >= 5);

  // Admin completes lot
  const patchRes = await fetch(`${BASE}/api/lots/${lotId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'completed' })
  });
  assert('Admin can patch lot status to "completed"', patchRes.status === 200);
  const patchedLot = await patchRes.json();
  assert('Lot status successfully updated to completed', patchedLot.status === 'completed');

  // Verify non-admin blocked
  const forbiddenRes = await fetch(`${BASE}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  assert('Collector is forbidden (403) from admin endpoints', forbiddenRes.status === 403);

  // ── Summary ──
  console.log('\n════════════════════════════════════════════════════════');
  console.log(`   Verification Finished: ${passed} Passed, ${failed} Failed`);
  console.log('════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runE2E().catch(err => {
  console.error('\nE2E Test encountered an unexpected exception:', err);
  process.exit(1);
});
