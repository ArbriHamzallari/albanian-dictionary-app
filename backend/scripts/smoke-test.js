/**
 * Smoke test: hits health and search to verify API is up and DB is connected.
 * Usage: node backend/scripts/smoke-test.js [baseUrl]
 * Example: node backend/scripts/smoke-test.js http://localhost:5000
 */
const baseUrl = process.argv[2] || process.env.API_URL || 'http://localhost:5000';

async function run() {
  let failed = 0;

  const get = async (path) => {
    const url = `${baseUrl.replace(/\/$/, '')}${path}`;
    const res = await fetch(url);
    const ok = res.ok;
    if (!ok) console.error(`FAIL ${path} ${res.status}`);
    return { ok, status: res.status, data: res.ok ? await res.json().catch(() => ({})) : null };
  };

  console.log('Smoke test base URL:', baseUrl);

  const health = await get('/api/health');
  if (!health.ok) {
    console.error('Health check failed');
    failed++;
  } else {
    console.log('OK GET /api/health', health.data);
  }

  const search = await get('/api/words/search?q=test');
  if (search.status !== 200 && search.status !== 404) {
    console.error('Search returned unexpected status', search.status);
    failed++;
  } else {
    console.log('OK GET /api/words/search (status ' + search.status + ')');
  }

  if (failed > 0) {
    console.error('Smoke test failed:', failed, 'check(s)');
    process.exit(1);
  }
  console.log('Smoke test passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
