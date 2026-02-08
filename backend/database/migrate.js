require('dotenv').config();
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL || typeof process.env.DATABASE_URL !== 'string') {
  console.error('Migration failed: DATABASE_URL is not set in backend/.env');
  process.exit(1);
}

const pool = require('../src/utils/db');

const migrationsDir = path.join(__dirname, 'migrations');

function splitStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const runMigrations = async () => {
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = splitStatements(sql);
    console.log(`Running migration: ${file} (${statements.length} statements)`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      const query = statement.endsWith(';') ? statement : statement + ';';
      try {
        await pool.query(query);
        const preview = query.substring(0, 50).replace(/\s+/g, ' ');
        console.log(`  OK: ${preview}${query.length > 50 ? '...' : ''}`);
      } catch (err) {
        console.error(`  FAILED statement ${i + 1}/${statements.length}:`, err.message);
        console.error('  SQL:', query.substring(0, 100) + (query.length > 100 ? '...' : ''));
        throw err;
      }
    }
  }

  console.log('Migrations completed.');
  await pool.end();
};

runMigrations().catch((error) => {
  console.error('Migration failed:', error.message);
  pool.end().catch(() => {});
  process.exit(1);
});
