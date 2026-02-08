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

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
