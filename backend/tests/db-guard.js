// Safety guard for the test suite.
//
// Tests register real rows via the API and do not always clean up. Running them
// with DATABASE_URL pointed at a remote/production database pollutes it — this
// is exactly how the @example.com / @ex.com users ended up in production.
//
// Require this module at the very top of every test file (before the pg pool is
// created). It refuses to run unless the target database is local. Use a local
// Postgres for tests, or set TEST_DATABASE_URL to one:
//   TEST_DATABASE_URL=postgresql://postgres@localhost:5432/fjalingo_test
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

function dbHost(url) {
  try {
    return new URL(String(url).replace(/^postgres(ql)?:\/\//i, 'http://')).hostname;
  } catch {
    return '';
  }
}

const host = dbHost(process.env.DATABASE_URL || '');
const isLocal = host === 'localhost' || host === '127.0.0.1';

if (!isLocal) {
  throw new Error(
    `Refusing to run tests against a non-local database (host: ${host || 'unknown'}).\n` +
    `Tests create real rows and have polluted production before. Point DATABASE_URL\n` +
    `at a LOCAL Postgres, or set TEST_DATABASE_URL, e.g.:\n` +
    `  TEST_DATABASE_URL=postgresql://postgres@localhost:5432/fjalingo_test`,
  );
}
