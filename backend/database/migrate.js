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
  // Split on semicolons at end of line, but skip semicolons inside dollar-quoted
  // blocks (e.g. DO $$ ... $$;).
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  for (const line of sql.split('\n')) {
    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches) {
      for (const _ of dollarMatches) inDollarQuote = !inDollarQuote;
    }
    current += line + '\n';
    if (!inDollarQuote && line.trimEnd().endsWith(';')) {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = '';
    }
  }
  const remaining = current.trim();
  if (remaining.length > 0) statements.push(remaining);
  return statements;
}

function migrationFiles() {
  return fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
}

async function ensureTrackingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedFilenames(client) {
  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  return new Set(rows.map((r) => r.filename));
}

// Record all current migration files as applied WITHOUT running them. For adopting
// tracking on a database that is already migrated (e.g. production) so a later
// `migrate` doesn't re-run everything.
async function baseline() {
  const client = await pool.connect();
  try {
    await ensureTrackingTable(client);
    const files = migrationFiles();
    for (const f of files) {
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
        [f]
      );
    }
    console.log(`Baseline: recorded ${files.length} migration(s) as applied (none executed).`);
    console.log('Future `npm run migrate` will apply only new files.');
  } finally {
    client.release();
  }
}

// Apply only pending (unrecorded) migrations, each in its own transaction.
async function migrate() {
  const client = await pool.connect();
  try {
    await ensureTrackingTable(client);
    const applied = await appliedFilenames(client);

    // Safety net: a database that already has application tables but no recorded
    // migrations predates tracking. Running migrations now would RE-RUN every file —
    // including destructive ones like 004's `DROP TABLE quiz_sessions`. Refuse and
    // point to baseline instead of wiping data.
    if (applied.size === 0) {
      const { rows } = await client.query("SELECT to_regclass('public.users') AS t");
      if (rows[0].t) {
        throw new Error(
          'This database already has tables but no migration history.\n' +
          '  It is already migrated — run `npm run migrate:baseline` ONCE to record the\n' +
          '  existing migrations as applied, then use `npm run migrate` for new ones.\n' +
          '  (Running migrate now would re-run every migration, including destructive ones.)'
        );
      }
    }

    const pending = migrationFiles().filter((f) => !applied.has(f));
    if (!pending.length) {
      console.log('No pending migrations — database is up to date.');
      return;
    }

    for (const file of pending) {
      const statements = splitStatements(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      console.log(`Applying ${file} (${statements.length} statements)...`);
      await client.query('BEGIN');
      try {
        for (const statement of statements) {
          if (!statement.trim()) continue;
          await client.query(statement.endsWith(';') ? statement : statement + ';');
        }
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  OK: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error(`  FAILED: ${file} — ${err.message}`);
        throw err;
      }
    }
    console.log(`Migrations completed (${pending.length} applied).`);
  } finally {
    client.release();
  }
}

const command = process.argv[2];
(command === 'baseline' ? baseline() : migrate())
  .catch((error) => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
