# Content pipeline — how words get into Fjalingo (daily-capable)

One direction, one format, one script:
**ChatGPT (enrichment JSON) → Arbri reviews → batch file in the repo → PR → merge →
`npm run import:words` → Supabase.**
Cursor/Claude Code never writes Albanian; the importer never "fixes" content — invalid
batches are rejected whole.

## 1. The JSON contract (what ChatGPT must emit — strict, nothing else)

```json
{
  "batch": "2026-07-05-turkish-set-3",
  "words": [
    {
      "borrowed_word": "eksperiencë",
      "correct_albanian": "përvojë",
      "origin_language": "neolatine",
      "word_type": "replace",
      "difficulty": 1,
      "definition_sq": "Njohuri a shkathtësi e fituar nga praktika dhe jeta.",
      "examples": [
        {
          "sentence_loan": "Kam shumë eksperiencë në këtë punë.",
          "sentence_clean": "Kam shumë përvojë në këtë punë.",
          "blank_form": "përvojë"
        }
      ]
    },
    {
      "borrowed_word": "byrek",
      "correct_albanian": null,
      "origin_language": "turqisht",
      "word_type": "heritage",
      "difficulty": 1,
      "definition_sq": "Brumë i hollë i mbushur me gjizë, spinaq a mish; fjalë e trashëguar nga osmanishtja, pa zëvendësim — pjesë e trashëgimisë.",
      "examples": []
    }
  ]
}
```

Validation rules the importer enforces (a batch failing ANY rule imports nothing):
- `origin_language` ∈ neolatine | anglisht | turqisht | greqisht | sllavisht (gjermanisht
  allowed but reserve it for the future German list).
- `word_type: "replace"` ⇒ `correct_albanian` non-empty AND ≥1 example pair (the
  fill-blank and spot games need the sentences).
- Every example needs `blank_form`: the EXACT surface form to blank in `sentence_clean`
  (the inflected form actually present, e.g. `"miratoi"` when `correct_albanian` is
  `"miratoj"`). It must occur verbatim (case-insensitive) in `sentence_clean` or the
  batch is rejected — no fuzzy matching.
- `word_type: "heritage"` ⇒ `correct_albanian: null` and `examples: []` (heritage words
  are history content, not quiz content).
- Every word has a non-empty `definition_sq`. `difficulty` ∈ 1..3.
- Diacritics (ë, ç) must be real UTF-8 characters. English glosses/etymons from the
  master CSV are input to ChatGPT only — they must never appear in any `_sq` field.

Origins histories are a separate one-time (updatable) file `backend/content/origins.json`:
```json
{ "origins": [ { "code": "turqisht", "name_sq": "Fjalë nga turqishtja",
  "era_sq": "Perandoria Osmane, shek. XV–XX", "intro_sq": "..." }, ... ] }
```

## 2. The ChatGPT prompt (Prompt A — keep using it, with these hard reminders)
Feed it CSV rows (borrowed_word, albanian_replacement, origin, word_type, meaning_en,
etymon) and require: output ONLY the JSON contract above, no markdown fences, no
commentary. It must (a) reclassify to `replace` any "heritage" row that actually has a
clean equivalent (haber→lajm, pazar→treg, hesap→llogari, vatan→atdhe…), (b) write a
natural Albanian definition for every word, (c) leave true heritage words with null
replacement and a definition that says so, (d) produce example sentences a native would
actually say — `sentence_loan` and `sentence_clean` identical except for the target word.
You review every line before it becomes a batch file. 30–60 words per batch keeps
review humane and JSON valid.

## 3. Daily loop (10 minutes once M2 lands)
1. Pick the next CSV rows (or new finds) → run Prompt A → get JSON.
2. Review the Albanian. Fix or reject rows.
3. Save as `backend/content/batches/YYYY-MM-DD-<name>.json` on a branch
   `content/YYYY-MM-DD-<name>`, open the PR (content is reviewed like code — the diff IS
   the review surface).
4. Merge, then from your machine (with the production `DATABASE_URL` in a local
   `.env.import`, never committed):
   `npm run import:words -- backend/content/batches/YYYY-MM-DD-<name>.json`
5. The script prints inserted/updated counts per origin. Re-running is always safe
   (idempotent). To correct a word later, ship a new batch containing it — upsert wins.

## 4. Importing what you already have (the backlog)
- Split the existing ChatGPT output into batch files under `backend/content/batches/`
  (e.g. `2026-07-XX-backlog-1.json` …), each ≤ ~60 words. If your current JSON's field
  names differ from the contract, ask ChatGPT to re-emit it in the contract shape —
  do NOT hand-massage it and do NOT let Cursor write a converter (one format, one path).
- Import `origins.json` first, then the backlog batches in any order.
- The importer upserts on `borrowed_word`, so the 396 seed words already in the DB are
  updated in place — no duplicates, legacy rows gain origin/type/difficulty.

## 5. What NOT to do
- No admin "add word" UI (single-writer content, versioned in git, is simpler and safer).
- No partial imports, no CSV path in the importer, no second format.
- Never import unreviewed Albanian, even "just to test" — seed data leaks into screenshots.