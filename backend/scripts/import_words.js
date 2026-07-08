#!/usr/bin/env node
//
// import_words.js — the ONE write path for enriched content (DATA-2).
// Contract: docs/plan/content-pipeline.md §1. Reject invalid batches WHOLE (no
// partial imports); safe to re-run (idempotent, upsert on borrowed_word).
//
//   npm run import:words -- backend/content/batches/2026-07-05-turkish-set-3.json
//   npm run import:words -- backend/content/origins.json
//
// A file may carry `words` (a batch), `origins` (histories), or both. origins.json
// is just a file whose only key is `origins`.

const path = require('path');
const fs = require('fs');

// Load DB creds BEFORE requiring the pool. The pipeline documents a local
// `.env.import` holding the production DATABASE_URL (never committed); fall back to
// `.env` for local runs.
const importEnv = path.join(__dirname, '..', '.env.import');
const defaultEnv = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: fs.existsSync(importEnv) ? importEnv : defaultEnv });

const Joi = require('joi');
const pool = require('../src/utils/db');

const ORIGIN_CODES = ['neolatine', 'anglisht', 'turqisht', 'greqisht', 'sllavisht', 'gjermanisht'];
const REPLACEMENT_CHAR = '�'; // decoding failure => diacritics aren't real UTF-8

// ── Contract schema (content-pipeline.md §1). Objects reject unknown keys by
// default — deliberately stricter than the app's stripUnknown, because "strict,
// nothing else" means a mistyped field (e.g. `definition` for `definition_sq`) is a
// rejection, not a silent drop. ──
const exampleSchema = Joi.object({
  sentence_loan: Joi.string().trim().min(1).required(),
  sentence_clean: Joi.string().trim().min(1).required(),
  // GAME-3: the EXACT surface form to blank in sentence_clean (handles Albanian
  // inflection — often differs from the lemma correct_albanian). Required so every
  // replace example is fill-blank-ready. A structural check below enforces that it
  // actually appears in sentence_clean (no fuzzy matching).
  blank_form: Joi.string().trim().min(1).required(),
});

const wordSchema = Joi.object({
  borrowed_word: Joi.string().trim().min(1).required(),
  origin_language: Joi.string().valid(...ORIGIN_CODES).required(),
  word_type: Joi.string().valid('replace', 'heritage').required(),
  difficulty: Joi.number().integer().min(1).max(3).required(),
  definition_sq: Joi.string().trim().min(1).required(),
  // replace ⇒ has its Albanian; heritage ⇒ correct_albanian null.
  correct_albanian: Joi.when('word_type', {
    is: 'replace',
    then: Joi.string().trim().min(1).required(),
    otherwise: Joi.valid(null).required(),
  }),
  // replace ⇒ ≥1 example pair (games need them); heritage ⇒ [].
  examples: Joi.when('word_type', {
    is: 'replace',
    then: Joi.array().items(exampleSchema).min(1).required(),
    otherwise: Joi.array().length(0).required(),
  }),
});

const originSchema = Joi.object({
  code: Joi.string().valid(...ORIGIN_CODES).required(),
  name_sq: Joi.string().trim().min(1).max(60).required(),
  intro_sq: Joi.string().trim().min(1).required(),
  era_sq: Joi.string().trim().max(120).allow(null, ''),
});

const fileSchema = Joi.object({
  batch: Joi.string().trim().min(1),
  words: Joi.array().items(wordSchema),
  origins: Joi.array().items(originSchema),
}).or('words', 'origins');

// Returns an array of human-readable violation strings ([] === valid). Collects
// EVERY violation so one run tells the reviewer all that's wrong.
function validateBatch(raw) {
  const { error, value } = fileSchema.validate(raw, { abortEarly: false });
  const violations = [];

  if (error) {
    for (const d of error.details) {
      const [top, idx] = d.path;
      let where = d.path.join('.');
      if (top === 'words' && typeof idx === 'number') {
        where = `words[${idx}] ("${raw?.words?.[idx]?.borrowed_word ?? '?'}") → ${d.path.slice(2).join('.') || '(row)'}`;
      } else if (top === 'origins' && typeof idx === 'number') {
        where = `origins[${idx}] ("${raw?.origins?.[idx]?.code ?? '?'}") → ${d.path.slice(2).join('.') || '(row)'}`;
      }
      violations.push(`${where}: ${d.message}`);
    }
  }

  // Structural checks Joi can't express. Run on the validated `value` when present.
  const data = value || raw || {};
  const words = Array.isArray(data.words) ? data.words : [];
  const origins = Array.isArray(data.origins) ? data.origins : [];

  const seenWords = new Map();
  words.forEach((w, i) => {
    const key = w?.borrowed_word;
    if (!key) return;
    if (seenWords.has(key)) {
      violations.push(`words[${i}] ("${key}"): duplicate borrowed_word (also words[${seenWords.get(key)}]) — one row per word per batch.`);
    } else {
      seenWords.set(key, i);
    }
  });

  const seenOrigins = new Map();
  origins.forEach((o, i) => {
    const key = o?.code;
    if (!key) return;
    if (seenOrigins.has(key)) {
      violations.push(`origins[${i}] ("${key}"): duplicate origin code (also origins[${seenOrigins.get(key)}]).`);
    } else {
      seenOrigins.set(key, i);
    }
  });

  // GAME-3: blank_form must be blankable — the exact surface form has to occur in
  // sentence_clean (case-insensitive). A mismatch is a content error, never fuzzy-fixed.
  words.forEach((w, i) => {
    const examples = Array.isArray(w?.examples) ? w.examples : [];
    examples.forEach((ex, j) => {
      const form = typeof ex?.blank_form === 'string' ? ex.blank_form.trim() : '';
      const clean = typeof ex?.sentence_clean === 'string' ? ex.sentence_clean : '';
      if (form && clean && !clean.toLowerCase().includes(form.toLowerCase())) {
        violations.push(
          `words[${i}] ("${w?.borrowed_word ?? '?'}") → examples[${j}].blank_form: "${form}" does not appear in sentence_clean "${clean}".`
        );
      }
    });
  });

  // Diacritics must be real UTF-8 — a replacement char means the source was mis-encoded.
  const scanSq = (obj, label) => {
    for (const [k, v] of Object.entries(obj || {})) {
      if (k.endsWith('_sq') && typeof v === 'string' && v.includes(REPLACEMENT_CHAR)) {
        violations.push(`${label} → ${k}: contains the Unicode replacement character (broken diacritics/encoding).`);
      }
    }
  };
  words.forEach((w, i) => scanSq(w, `words[${i}] ("${w?.borrowed_word ?? '?'}")`));
  origins.forEach((o, i) => scanSq(o, `origins[${i}] ("${o?.code ?? '?'}")`));

  return violations;
}

async function importOrigins(client, origins) {
  for (const o of origins) {
    // Do not touch word_count here — it is recomputed from `words` at the end.
    await client.query(
      `INSERT INTO origins (code, name_sq, intro_sq, era_sq)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET
         name_sq = EXCLUDED.name_sq,
         intro_sq = EXCLUDED.intro_sq,
         era_sq = EXCLUDED.era_sq`,
      [o.code, o.name_sq, o.intro_sq, o.era_sq ?? null]
    );
  }
}

async function importWords(client, words) {
  let inserted = 0;
  let updated = 0;
  let examplesWritten = 0;
  const perOrigin = {};

  for (const w of words) {
    // Upsert on borrowed_word. `(xmax = 0)` distinguishes a fresh INSERT (0) from a
    // conflict UPDATE (nonzero) — the idempotency signal for the summary.
    const res = await client.query(
      `INSERT INTO words
         (borrowed_word, correct_albanian, origin_language, word_type, difficulty, is_verified)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (borrowed_word) DO UPDATE SET
         correct_albanian = EXCLUDED.correct_albanian,
         origin_language  = EXCLUDED.origin_language,
         word_type        = EXCLUDED.word_type,
         difficulty       = EXCLUDED.difficulty,
         updated_at       = now()
       RETURNING id, (xmax = 0) AS inserted`,
      [w.borrowed_word, w.correct_albanian ?? null, w.origin_language, w.word_type, w.difficulty]
    );
    const { id, inserted: wasInserted } = res.rows[0];
    if (wasInserted) inserted += 1;
    else updated += 1;
    perOrigin[w.origin_language] = (perOrigin[w.origin_language] || 0) + 1;

    // The batch is the source of truth for this word: replace its definition and
    // examples wholesale (delete-then-insert, matching seed.js).
    await client.query('DELETE FROM definitions WHERE word_id = $1', [id]);
    await client.query(
      `INSERT INTO definitions (word_id, definition_text, definition_order) VALUES ($1, $2, 1)`,
      [id, w.definition_sq]
    );

    await client.query('DELETE FROM word_examples WHERE word_id = $1', [id]);
    for (const ex of w.examples) {
      await client.query(
        `INSERT INTO word_examples (word_id, sentence_loan, sentence_clean, blank_form) VALUES ($1, $2, $3, $4)`,
        [id, ex.sentence_loan, ex.sentence_clean, ex.blank_form]
      );
      examplesWritten += 1;
    }
  }

  return { inserted, updated, examplesWritten, perOrigin };
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: npm run import:words -- <path/to/batch-or-origins.json>');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Could not read/parse JSON: ${filePath}\n  ${err.message}`);
    process.exit(1);
  }

  const violations = validateBatch(raw);
  if (violations.length) {
    console.error(`Batch rejected — ${violations.length} violation(s). Nothing imported.\n`);
    for (const v of violations) console.error(`  ✗ ${v}`);
    process.exit(1);
  }

  const words = Array.isArray(raw.words) ? raw.words : [];
  const origins = Array.isArray(raw.origins) ? raw.origins : [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await importOrigins(client, origins);
    const stats = await importWords(client, words);
    // Recompute every origin's word_count from the words table (source of truth).
    await client.query(
      `UPDATE origins o SET word_count = (
         SELECT COUNT(*) FROM words w WHERE w.origin_language = o.code
       )`
    );
    await client.query('COMMIT');

    const finalCounts = await client.query(
      'SELECT code, word_count FROM origins ORDER BY code'
    );

    const label = raw.batch || path.basename(filePath);
    console.log(`✓ Imported ${label}`);
    if (origins.length) console.log(`  origins upserted: ${origins.length}`);
    console.log(`  words: ${stats.inserted} inserted, ${stats.updated} updated (${stats.inserted + stats.updated} total)`);
    console.log(`  examples written: ${stats.examplesWritten}`);
    if (words.length) {
      const perOrigin = Object.entries(stats.perOrigin)
        .map(([code, n]) => `${code} ${n}`)
        .join(', ');
      console.log(`  per origin (this batch): ${perOrigin}`);
    }
    console.log('  origins.word_count now:');
    for (const row of finalCounts.rows) {
      console.log(`    ${row.code}: ${row.word_count}`);
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Import failed — transaction rolled back, nothing imported:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateBatch };
