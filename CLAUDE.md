# CLAUDE.md — Fjalingo (root)

> Source of truth. Replaces the previous CLAUDE.md entirely. Scoped rules live in
> `backend/CLAUDE.md` and `frontend/CLAUDE.md`; milestone context and kickoff tasks live
> in `docs/plan/`. Read the file for the area you're touching — nothing else.

## What Fjalingo is
A gamified web app for Albanians — diaspora and homeland — who already speak Albanian
but speak it mixed with loanwords. Not an app to learn Albanian; an app to get your
Albanian back. The mechanic: take a borrowed word the user already says (from Turkish,
Italian/Latin, English, Greek, Slavic layers), teach the authentic Albanian word, wrap
it in a daily habit. History of *why* each layer entered Albanian is part of the product,
not decoration.

Positioning (user-facing, Albanian): the plain phrase is **"fjalë të huazuara"** — the
coined term "Alblish" is dead in all user-facing copy (v1.2 COPY-2).

## Method (applies to every task)
Follow the **karpathy-guidelines** skill (installed as a Claude Code plugin and as
`.cursor/rules/karpathy-guidelines.mdc`): think before coding, simplicity first,
surgical changes, goal-driven execution. Additionally, always work as a **detective**:
state the theory of the crime → collect evidence in the actual code → confirm or discard
the theory → only then make the surgical fix → verify against acceptance criteria.
One task = one branch (`fix/<id>-<slug>` or `feat/<id>-<slug>`) = one PR. Ping Arbri
before chaining. If uncertain about any API or library, search its current docs — never
guess.

## Locked decisions — do NOT relitigate
- Stack stays: React 18 + Vite + Tailwind · Node/Express · Postgres (Supabase managed).
- Hosting: **frontend Vercel, backend Fly.io, DB Supabase.** One deploy path each.
- **Paddle** billing, single SKU: €25/year Premium. Merchant is Arbri Hamzallari
  (sole proprietor), brand Fjalingo.
- No hearts, no lives, no gems, no ads. Rewards = XP, streaks, achievements, league
  rank, cosmetic avatars only.
- Origin taxonomy: `neolatine | anglisht | turqisht | greqisht | sllavisht`
  (`gjermanisht` reserved in the CHECK constraint, unused until the German list lands).
- Two word types: `replace` (has a clean Albanian equivalent → feeds the games) and
  `heritage` (naturalized, no replacement → history/awareness only, never quizzed as
  an error).
- Fill-in-the-blank input = **word bank (tap)**, never typed (ë/ç problem).
- Distractors come from the **same origin + adjacent difficulty**, never random.
- Admin role is set by manual DB action only. No admin-creation UI, ever.
- Free/Premium boundary: see `docs/plan/free-premium.md`.

## Who writes what (hard boundaries)
- **Cursor/Claude Code** writes code. It NEVER writes or "improves" Albanian copy —
  all user-facing strings go through `frontend/src/i18n/sq.json` and are produced by
  ChatGPT + reviewed by Arbri. If a task needs a new Albanian string, insert a clearly
  marked placeholder key (`"TODO_SQ_<key>"`) and list it in the PR description.
- The enrichment JSON (definitions, example sentences, origin metadata) is produced
  externally. Code only validates and imports it (`docs/plan/content-pipeline.md`).

## Child-safety hard rules (do not soften; any weakening change must STOP and flag Arbri)
- Age-gate at signup; EU consent age per country; US under-13 = COPPA.
- Minor profiles private-by-default; only display name + avatar ever public.
- No free-text DMs for minors — accepted friends only, preset phrases + emoji.
- No path from leaderboard to private contact; leaderboard pseudonymous, opt-out,
  segmented kids/adults.
- Block + report + profanity/PII filter on every user-generated text surface.

## Brand tokens (never hex-code in components — use `frontend/src/styles/tokens.css`)
- `--brand-green: #2BB673` (the only green; `#58CC02` is banned), `--brand-green-dark:
  #1F8F58`, `--accent-yellow: #FFC93C`, `--accent-coral: #FF7A6B`, `--accent-purple:
  #8B7FF5` (premium only), ink/paper/cloud/line neutrals as defined in tokens.css.
- Nunito; headings ≥600, buttons/big numbers 800–900; ≤3 text sizes per screen.
- Albanian-first UI with correct diacritics (ë, ç) everywhere. English only in code,
  commits, admin screens, and the one public English Paddle-explainer page.

## Non-negotiable technical invariants
- Logged-in progress is **server-authoritative**. localStorage is for guests only.
- Quiz/game grading happens on the server via `quiz_sessions`; the client never mints XP.
- No silent catches: every catch logs or rethrows. Fail fast at boundaries (Joi +
  Postgres constraints), no speculative fallbacks.
- Parameterized SQL only. Secrets only in env; never commit `.env`.
- Auth = httpOnly cookies + double-submit CSRF. Don't move tokens to localStorage.

## Commands
Backend: `npm install` · `npm run dev` · `npm run migrate` · `npm run seed` · `npm test`
Frontend: `npm install` · `npm run dev` · `npm run build` · `npm run preview`

## Current milestones (details + kickoff prompts in docs/plan/)
M1 Paddle-ready → M2 Content live → M3 Four games → M4 New face → M5 Growth.
Do them in order; M3 game prompts are only written after M2's content is imported.