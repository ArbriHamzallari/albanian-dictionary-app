const fs = require('fs');
const { Pool } = require('pg');

function buildSslConfig() {
  const ssl = { rejectUnauthorized: true };
  const caPath = process.env.PGSSLROOTCERT?.trim();
  if (caPath) {
    ssl.ca = fs.readFileSync(caPath, 'utf8');
  }
  return ssl;
}

function decodeUrlComponent(value) {
  return value ? decodeURIComponent(value) : undefined;
}

const pgHost = process.env.PGHOST;
const pgDatabase = process.env.PGDATABASE;
const pgUser = process.env.PGUSER;
const pgPassword = process.env.PGPASSWORD;
const pgPort = process.env.PGPORT;
const pgSslMode = process.env.PGSSLMODE;
const hasPgConfig = Boolean(pgHost || pgDatabase || pgUser || pgPassword || pgPort);

const connectionString = process.env.DATABASE_URL;
if (!hasPgConfig && (typeof connectionString !== 'string' || !connectionString.trim())) {
  throw new Error(
    'Set DATABASE_URL or PG* variables in backend/.env. Example: postgresql://postgres:YOUR_PASSWORD@localhost:5432/shkolla_dictionary.'
  );
}

let config;
if (hasPgConfig) {
  const normalizedHost = typeof pgHost === 'string' ? pgHost.trim() : '';
  const isLocal = normalizedHost === 'localhost' || normalizedHost === '127.0.0.1';
  const sslMode = typeof pgSslMode === 'string' ? pgSslMode.trim().toLowerCase() : '';
  const sslEnabled = sslMode ? sslMode !== 'disable' : !isLocal;

  config = {
    host: normalizedHost || undefined,
    port: pgPort ? parseInt(pgPort, 10) : 5432,
    database: typeof pgDatabase === 'string' && pgDatabase.trim() ? pgDatabase.trim() : undefined,
    user: typeof pgUser === 'string' && pgUser.trim() ? pgUser.trim() : undefined,
    password: pgPassword != null && pgPassword !== '' ? pgPassword : '',
    ...(sslEnabled ? { ssl: buildSslConfig() } : {}),
  };
} else {
  const parsed = new URL(connectionString.trim().replace(/^postgres(ql)?:\/\//i, 'http://'));
  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  const sslmode = parsed.searchParams.get('sslmode')?.toLowerCase();
  const sslDisabled = sslmode === 'disable';
  const sslRequired = sslmode === 'require' || sslmode === 'verify-ca' || sslmode === 'verify-full';
  const useSsl = !sslDisabled && (!isLocal || sslRequired);
  config = {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    database: (parsed.pathname || '/').slice(1) || undefined,
    user: decodeUrlComponent(parsed.username),
    password: parsed.password ? decodeUrlComponent(parsed.password) : '',
    ...(useSsl ? { ssl: buildSslConfig() } : {}),
  };
}

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
