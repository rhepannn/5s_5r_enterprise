// Load test sederhana — ukur p50/p95/rps endpoint berat di bawah konkurensi.
const BASE = 'http://localhost:3001';

async function login() {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@5s-enterprise.com', password: 'Admin1234' }),
  });
  return (await r.json()).data.accessToken;
}

async function timed(url, H) {
  const t = performance.now();
  const r = await fetch(url, { headers: H });
  await r.text();
  return { ms: performance.now() - t, ok: r.ok };
}

async function loadTest(label, url, H, n, conc, warm = true) {
  if (warm) { await timed(url, H); await new Promise((r) => setTimeout(r, 100)); } // hangatkan cache dulu
  const results = [];
  let idx = 0;
  const worker = async () => { while (idx < n) { idx++; results.push(await timed(url, H)); } };
  const t = performance.now();
  await Promise.all(Array.from({ length: conc }, worker));
  const total = performance.now() - t;
  const lat = results.map((r) => r.ms).sort((a, b) => a - b);
  const p = (q) => lat[Math.min(lat.length - 1, Math.floor(lat.length * q))].toFixed(0);
  const errors = results.filter((r) => !r.ok).length;
  console.log(`${label.padEnd(28)} n=${n} conc=${conc} | ${(n / (total / 1000)).toFixed(1)} req/s | p50=${p(0.5)}ms p95=${p(0.95)}ms max=${lat[lat.length - 1].toFixed(0)}ms | error=${errors}`);
}

(async () => {
  const tok = await login();
  const H = { Authorization: `Bearer ${tok}` };
  const me = await (await fetch(`${BASE}/api/auth/me`, { headers: H })).json();
  const periods = await (await fetch(`${BASE}/api/audit/periods`, { headers: H })).json();
  const periodId = periods.data[0].id;
  console.log(`\nLoad test (data di Supabase cloud — latency termasuk jaringan)\n`);
  await loadTest('GET /health', `${BASE}/health`, {}, 300, 50);
  await loadTest('GET /competition/leaderboard', `${BASE}/api/competition/leaderboard?periodId=${periodId}`, H, 55, 20);
  await loadTest('GET /dashboard/summary', `${BASE}/api/dashboard/summary`, H, 55, 20);
  await loadTest('GET /audit/sessions', `${BASE}/api/audit/sessions`, H, 55, 20);
  console.log('');
})();
