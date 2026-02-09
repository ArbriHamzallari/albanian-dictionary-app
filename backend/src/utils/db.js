const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (typeof connectionString !== 'string' || !connectionString.trim()) {
  throw new Error(
    'DATABASE_URL must be set and a string in backend/.env. Example: postgresql://postgres:YOUR_PASSWORD@localhost:5432/shkolla_dictionary.'
  );
}

const parsed = new URL(connectionString.trim().replace(/^postgres(ql)?:\/\//i, 'http://'));
const config = {
  host: parsed.hostname,
  port: parsed.port ? parseInt(parsed.port, 10) : 5432,
  database: (parsed.pathname || '/').slice(1) || undefined,
  user: parsed.username || undefined,
  password: parsed.password != null && parsed.password !== '' ? parsed.password : '',
};

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
