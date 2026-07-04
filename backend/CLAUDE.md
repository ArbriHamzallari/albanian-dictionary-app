# CLAUDE.md — backend (Node/Express, Fly.io, Supabase Postgres)

Applies when touching `backend/`. Root CLAUDE.md rules still hold.

## Structure (do not rearrange)
`server.js` (app wiring, helmet/CSP, CORS allowlist, rate limits, raw body only on
`/api/billing/webhook`) · `src/routes/*` (mounting + middleware only) ·
`src/controllers/*` (logic) · `src/middleware/{auth,csrf,entitlements}.js` ·
`src/utils/*` (shared helpers — reuse, don't fork) · `database/migrations/NNN_name.sql`
(sequential, next is 022) · `tests/*` (node test runner via `npm test`).

## Rules
- Validate every request body at the boundary with Joi schemas in `src/utils/validation.js`,
  always `.options({ stripUnknown: true })`. Let Postgres constraints be the second net.
- Parameterized queries only (`pool.query(text, values)`). Multi-write operations run in
  a transaction on a dedicated client (see `progressController.submitQuiz` as the pattern).
- Every catch logs or rethrows. Errors return `{ message }` — user-facing messages in
  Albanian, logs in English.
- Auth: httpOnly access+refresh cookies, CSRF double-submit on state-changing routes.
  Never accept `role` from client input outside the admin-only PATCH (SEC-1).
- Server-authoritative progress: XP, streaks, levels computed here. Level formula lives
  in ONE place (`LEVEL_FORMULA_SQL` in progressController) — never duplicate it.
- Paddle: webhook signature via `verifyPaddleWebhookSignature` (timing-safe), idempotency
  via `processed_webhook_events`, checkout↔user binding via `verifyCheckoutUserSignature`.
  Don't restructure these; extend them.
- Migrations are forward-only, idempotent where possible (`IF NOT EXISTS`), and each PR
  ships at most one migration file.
- New endpoints that expose data must respect: minors' fields never leak (see
  `utils/childSafety.js` + `utils/access.js`), suspended users blocked, admin routes
  behind admin middleware + audit log (`utils/auditLog.js`).

## Content data model (after migration 022)
`words`: `borrowed_word` (unique), `correct_albanian` (NULLable — NULL means heritage),
`origin_language` (CHECK: the six codes), `word_type` (`replace|heritage`),
`difficulty` (1..3). `word_examples(word_id, sentence_loan, sentence_clean)`.
`origins(code PK, name_sq, intro_sq, era_sq, word_count)`. `definitions` (existing) holds
the Albanian definition. Games read ONLY `word_type='replace'`; fill-blank and
spot-the-loanword additionally require ≥1 example row.

## Import pipeline
`scripts/import_words.js` is the only write path for content (see
`docs/plan/content-pipeline.md` for the JSON contract). It validates the whole batch
first and rejects it entirely on any invalid row — no partial imports.