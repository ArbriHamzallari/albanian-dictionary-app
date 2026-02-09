const { Pool } = require('pg');

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
    ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
  };
} else {
  const parsed = new URL(connectionString.trim().replace(/^postgres(ql)?:\/\//i, 'http://'));
  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  config = {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    database: (parsed.pathname || '/').slice(1) || undefined,
    user: parsed.username || undefined,
    password: parsed.password != null && parsed.password !== '' ? parsed.password : '',
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  };
}

const pool = new Pool(config);

const originalQuery = pool.query.bind(pool);
pool.query = (text, params, cb) => {
  const queryText = typeof text === 'string' ? text : text?.text;
  const shouldLog = typeof queryText === 'string'
    && /uuid|user_id|rank|profile|auth\/me/i.test(queryText);

  if (shouldLog) {
    console.error('SQL:', queryText);
    console.error('PARAMS:', params);
    console.error('PARAM TYPES:', Array.isArray(params) ? params.map((v) => typeof v) : null);
  }

  return originalQuery(text, params, cb);
};

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
