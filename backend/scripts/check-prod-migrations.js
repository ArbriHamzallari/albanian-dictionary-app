// Read-only probe: reports which of migrations 020–023 are actually applied to the
// connected database, and what the schema_migrations tracking table currently records.
//
// Why this exists: 022 (content model) and 023 (word slugs) were applied to prod by
// hand from feature branches before they were serialized into main, so prod's real
// schema can be AHEAD of what schema_migrations records. Before relying on the fly.io
// release_command, the tracking table must be reconciled to match what prod truly has —
// otherwise a deploy re-runs an already-applied migration against a DB that already has
// that schema, and fails.
//
// This script writes NOTHING. Run it against prod, read the recommendation, then
// baseline accordingly.
//
//   fly ssh console -a albanian-dictionary-app
//   cd /app && node scripts/check-prod-migrations.js
//
// Or locally with a temporary backend/.env holding the prod DATABASE_URL.

require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Set it in the environment or backend/.env.');
  process.exit(1);
}

const pool = require('../src/utils/db');

// Each probe returns true if the schema object it created is present in the DB.
// `file` is the migration filename to record in schema_migrations if `applied` is true.
const PROBES = [
  {
    file: '020_user_stats_total_questions.sql',
    what: 'user_stats.total_questions column',
    sql: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_stats' AND column_name = 'total_questions'`,
  },
  {
    file: '021_seed_achievements.sql',
    what: "seeded achievements (key = 'first_quiz')",
    note: 'seed-only migration; presence is a heuristic, not a schema guarantee',
    sql: `SELECT 1 FROM achievements WHERE key = 'first_quiz'`,
  },
  {
    file: '022_content_model.sql',
    what: 'words.origin_language + word_examples + origins',
    // All three must exist for 022 to be considered fully applied.
    sql: `SELECT 1
            WHERE EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name = 'words' AND column_name = 'origin_language')
              AND to_regclass('public.word_examples') IS NOT NULL
              AND to_regclass('public.origins') IS NOT NULL`,
  },
  {
    file: '023_word_slugs.sql',
    what: 'words.slug column',
    sql: `SELECT 1 FROM information_schema.columns
            WHERE table_name = 'words' AND column_name = 'slug'`,
  },
];

async function tableExists(name) {
  const { rows } = await pool.query('SELECT to_regclass($1) AS t', [name]);
  return rows[0].t !== null;
}

async function main() {
  const dbName = (await pool.query('SELECT current_database() AS db')).rows[0].db;
  console.log(`\nConnected to database: ${dbName}\n`);

  // 1. What does the tracking table currently record?
  const tracked = new Set();
  if (await tableExists('public.schema_migrations')) {
    const { rows } = await pool.query(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    rows.forEach((r) => tracked.add(r.filename));
    console.log(`schema_migrations exists — ${rows.length} row(s) recorded:`);
    if (rows.length) rows.forEach((r) => console.log(`    ${r.filename}`));
    else console.log('    (empty — tracking initialized but nothing recorded)');
  } else {
    console.log('schema_migrations does NOT exist yet (tracking never initialized).');
  }

  // 2. Probe the actual schema for each late migration.
  console.log('\nActual schema state (020–023):\n');
  const shouldRecord = [];
  for (const probe of PROBES) {
    let applied = false;
    try {
      const { rowCount } = await pool.query(probe.sql);
      applied = rowCount > 0;
    } catch (err) {
      // A probe that references a not-yet-existent table throws; that means NOT applied.
      applied = false;
    }
    const recorded = tracked.has(probe.file);
    const flag = applied
      ? recorded
        ? 'APPLIED (recorded)'
        : 'APPLIED — NOT recorded  <-- baseline must add this'
      : recorded
        ? 'MISSING but recorded    <-- tracking is WRONG'
        : 'not applied';
    console.log(`  ${probe.file.padEnd(34)} ${flag}`);
    console.log(`      ${probe.what}${probe.note ? `  (${probe.note})` : ''}`);
    if (applied && !recorded) shouldRecord.push(probe.file);
  }

  // 3. Recommendation.
  console.log('\n--- Recommendation ---');
  if (shouldRecord.length === 0) {
    console.log('No mismatch: everything applied is already tracked (or nothing extra is applied).');
  } else {
    console.log('Prod has these migrations applied but NOT recorded in schema_migrations.');
    console.log('After you merge their branches into main, the release_command would try to');
    console.log('RE-RUN them and fail. Record them as applied WITHOUT running, e.g.:\n');
    shouldRecord.forEach((f) => {
      console.log(
        `  INSERT INTO schema_migrations (filename) VALUES ('${f}') ON CONFLICT DO NOTHING;`
      );
    });
    console.log('\n(Only run these once main actually contains those migration files, so the');
    console.log(' filenames the runner scans match the rows you inserted.)');
  }
  console.log('');
}

main()
  .catch((err) => {
    console.error('Probe failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
