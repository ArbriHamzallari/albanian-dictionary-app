// Read-only. Shows what content is actually in the connected DB, and cross-checks the
// local batch files against it to predict slug collisions BEFORE you import.
//
// Why: words.slug is `GENERATED ALWAYS AS lower(borrowed_word, spaces->hyphens)` with a
// UNIQUE index. Two borrowed_words that differ only in case/whitespace share one slug, so
// the importer's ON CONFLICT (borrowed_word) does NOT catch it — the import rolls back on
// idx_words_slug. This script names every such collision so you can fix the source.
//
// Writes NOTHING.
//   cd backend && node scripts/content-status.js
// (needs DATABASE_URL in the environment or backend/.env — the prod one to inspect prod.)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/utils/db');

const slugify = (w) => String(w).trim().replace(/\s+/g, '-').toLowerCase(); // mirrors the generated column

async function main() {
  const db = (await pool.query('SELECT current_database() AS d')).rows[0].d;
  console.log(`\nDatabase: ${db}\n`);

  // 1. What's in the words table now.
  const counts = await pool.query(
    `SELECT origin_language, count(*)::int AS n FROM words GROUP BY 1 ORDER BY 1`
  );
  const total = counts.rows.reduce((a, r) => a + r.n, 0);
  console.log(`words: ${total} total`);
  counts.rows.forEach((r) => console.log(`  ${r.origin_language ?? '(null)'}: ${r.n}`));

  const wotd = await pool.query(`SELECT word_id FROM word_of_the_day WHERE display_date = CURRENT_DATE`);
  console.log(`word_of_the_day for today: ${wotd.rows.length ? 'set (word ' + wotd.rows[0].word_id + ')' : 'NOT set'}`);

  // 2. Existing slug -> borrowed_word map (to detect case/space collisions).
  const existing = await pool.query(`SELECT borrowed_word, slug FROM words`);
  const prodBySlug = new Map(existing.rows.map((r) => [r.slug, r.borrowed_word]));

  // 3. Walk the batch files and classify each word against prod + within-batch.
  const dir = path.join(__dirname, '..', 'content', 'batches');
  const seenSlug = new Map(); // slug -> "word [file]" first seen in the batches
  let collisions = 0;
  let newRows = 0;
  let exists = 0;

  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const w of data.words || []) {
      const bw = w.borrowed_word;
      const s = slugify(bw);
      const label = `${bw}  [${f}]`;

      // within-batch collision (different borrowed_word, same slug)
      if (seenSlug.has(s) && seenSlug.get(s).bw !== bw) {
        collisions++;
        console.log(`\nBATCH×BATCH  slug "${s}"`);
        console.log(`     ${seenSlug.get(s).label}`);
        console.log(`     ${label}`);
      } else if (!seenSlug.has(s)) {
        seenSlug.set(s, { bw, label });
      }

      // vs prod
      const prodBw = prodBySlug.get(s);
      if (prodBw === undefined) newRows++;
      else if (prodBw === bw) exists++;
      else {
        collisions++;
        console.log(`\nBATCH×PROD   slug "${s}"`);
        console.log(`     prod already has: "${prodBw}"`);
        console.log(`     batch has:        ${label}`);
      }
    }
  }

  console.log('\n--- batch vs prod summary ---');
  console.log(`  new (not in prod):        ${newRows}`);
  console.log(`  already present (same):   ${exists}`);
  console.log(`  COLLISIONS (must fix):    ${collisions}`);
  if (collisions === 0) console.log('  -> safe to import.');
  else console.log('  -> normalize the offending borrowed_word (usually to lowercase) so the slug matches, then re-import.');
  console.log('');
}

main()
  .catch((e) => { console.error('content-status failed:', e.message); process.exitCode = 1; })
  .finally(() => pool.end().catch(() => {}));
