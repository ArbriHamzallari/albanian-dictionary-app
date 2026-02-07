const fs = require('fs');
const path = require('path');
const pool = require('../src/utils/db');

const migrationsDir = path.join(__dirname, 'migrations');

const runMigrations = async () => {
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
  }

  console.log('Migrations completed.');
  await pool.end();
};

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  pool.end();
  process.exit(1);
});
