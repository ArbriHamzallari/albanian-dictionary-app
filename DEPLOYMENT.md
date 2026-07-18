# Deploy Fjalingo (Vercel + Fly.io + Database)

This guide gets the app running online. You will use:

- **Vercel** – frontend (always available)
- **Fly.io** – backend API (always-on container)
- **Supabase** – managed PostgreSQL

**Important:** Vercel hosts the static frontend build (and serverless functions). It does **not** run our persistent Node.js server. The backend is deployed on Fly.io from the repo root using `fly.toml` and `backend/Dockerfile`. The frontend's SPA routing is handled by `frontend/vercel.json`.

---

## Prerequisites

- A [GitHub](https://github.com) account (repo with this project)
- [Fly.io](https://fly.io) account (credit card required; smallest VM is ~$5/mo always-on)
- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) project (managed PostgreSQL)
- [flyctl](https://fly.io/docs/hands-on/install-flyctl/) installed locally

---

## Step 1: Database

Use your existing Supabase project or create a new Postgres instance.

1. Copy the **pooled** connection string (must include `sslmode=require` for Supabase).
2. Save it as `DATABASE_URL` for Step 2.

---

## Step 2: Deploy the backend on Fly.io

All commands below run from the **repo root** (`albanian-dictionary-app/`).

### 2a. One-time Fly setup

```powershell
fly auth login
```

The Fly app is **`albanian-dictionary-app`** (`app` in `fly.toml`, region `ams`), so its API
host is `https://albanian-dictionary-app.fly.dev`. If you are creating a fresh Fly app, the
name must be globally unique — pick your own and update `app = "..."` in `fly.toml`:

```powershell
fly apps create albanian-dictionary-app
```

### 2b. Set secrets (before first deploy)

Replace placeholders with your real values. Do **not** commit these.

```powershell
fly secrets set `
  NODE_ENV=production `
  DATABASE_URL="postgresql://..." `
  JWT_SECRET="your-long-random-secret" `
  FRONTEND_URL="https://your-app.vercel.app" `
  CRON_SECRET="your-long-random-cron-secret" `
  PADDLE_ENVIRONMENT=sandbox `
  PADDLE_CLIENT_TOKEN="test_..." `
  PADDLE_PRICE_ID_ANNUAL="pri_..." `
  PADDLE_PRICE_ID_MONTHLY="pri_..." `
  PADDLE_WEBHOOK_SECRET="your_webhook_secret"
```

Optional secrets:

| Secret | Purpose |
|--------|---------|
| `ADMIN_EMAIL` | Admin account email for seed (production) |
| `ADMIN_PASSWORD` | Admin account password for seed (production) |
| `FRONTEND_URL_EXTRA` | Comma-separated extra CORS origins (e.g. custom domain `https://fjalingo.com`) |
| `FRONTEND_URL_ALT` | Second primary origin if needed |
| `PADDLE_CHECKOUT_SECRET` | Checkout signing secret (defaults to `JWT_SECRET`) |
| `PREMIUM_ANNUAL_PRICE_EUR` | Revenue estimate for admin metrics (default 25) |

See the **Secrets checklist** section below for what each required secret does.

**CORS:** `FRONTEND_URL` must be your production Vercel origin exactly (`https://…`, no trailing slash). The API rejects all other browser origins — there is no allow-all fallback.

### 2c. Deploy

```powershell
fly deploy
```

Note your API host: `https://albanian-dictionary-app.fly.dev`  
API base URL for the frontend: `https://albanian-dictionary-app.fly.dev/api`

### 2d. Run migrations and seed (one-time)

On your machine, with the same `DATABASE_URL` in a temporary `backend/.env`:

```powershell
cd backend
npm run migrate
npm run seed
```

Remove or secure the local `.env` afterward. Do not commit it.

> **Automatic migrations on deploy.** `fly.toml` has `[deploy] release_command =
> "npm run migrate"`, so every `fly deploy` applies pending migrations before the new
> version serves traffic (and no-ops when nothing is pending).
>
> **One-time prerequisite — reconcile prod's tracking first.** Migration tracking
> (`schema_migrations`) was added after prod had already been migrated by hand, and some
> migrations (e.g. `022_content_model.sql`, `023_word_slugs.sql`) were applied to prod
> straight from feature branches. So prod's real schema can be *ahead* of what
> `schema_migrations` records. If you enable the release command without reconciling,
> a later deploy either refuses to run (empty tracking on a populated DB) or re-runs an
> already-applied migration and fails. Reconcile in this order:
>
> 1. Probe prod's real state (read-only) to see which migrations are applied vs recorded:
>    ```
>    fly ssh console -a albanian-dictionary-app
>    cd /app && node scripts/check-prod-migrations.js
>    ```
> 2. Record every already-applied file in `schema_migrations` (the probe prints the exact
>    `INSERT … ON CONFLICT DO NOTHING` statements). `npm run migrate:baseline` records the
>    files present in the working tree — run it only from a tree that matches what prod
>    actually has, or run the probe's INSERTs directly.
>
> Only once `schema_migrations` honestly reflects prod should you rely on the release
> command. After that, `npm run migrate` applies only genuinely new files.

### 2e. Verify health (cold-start acceptance test)

```powershell
curl https://albanian-dictionary-app.fly.dev/api/health
```

Expected response (200, typically &lt;300ms):

```json
{ "status": "ok", "uptime": 42, "db": "ok" }
```

If `db` is `"fail"`, check `DATABASE_URL` and Supabase network/SSL settings.

---

## Step 3: Deploy the frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import your GitHub repo.
2. Project settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. **Environment variable** — add this **before the first deploy** (a missing/late
   `VITE_API_URL` bakes an undefined API URL into the bundle even though the deploy
   "succeeds"). Set it for **Production, Preview, and Development**:
   - `VITE_API_URL` = `https://albanian-dictionary-app.fly.dev/api` (**must end with `/api`**)
4. Deploy and copy your site URL (e.g. `https://your-app.vercel.app`).

Optional frontend env vars (set alongside `VITE_API_URL` if used):

| Variable | Purpose |
|----------|---------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web client ID (same value as backend `GOOGLE_CLIENT_ID`). If unset, the Google button is hidden. |
| `VITE_CLARITY_PROJECT_ID` | Microsoft Clarity analytics project ID. If unset, Clarity is disabled. |
| `VITE_SITE_URL` | Overrides the canonical/OG origin (defaults to the live domain); handy on preview deploys. |

The SPA rewrite (so `/kerko`, `/kuizi`, `/admin` don't 404 on hard refresh) and the
security headers are handled by `frontend/vercel.json` — no dashboard config needed.

> **CSP note:** the inline theme script in `frontend/index.html` (the dark-mode FOUC
> guard) is hash-pinned in `frontend/vercel.json`'s `script-src` directive. If you edit
> that script, the browser will block it and Chrome's console error will print the new
> `sha256-…` hash — update it in `vercel.json` in the **same PR**, or the theme won't
> apply in production. `connect-src` names the API host directly (`https://api.fjalingo.com`);
> update it there if the API origin changes.

> **Vercel Hobby tier prohibits commercial use.** Upgrade the project to **Pro** before
> launching the paid Paddle tier.

---

## Step 4: Connect frontend and backend (CORS)

The backend's `FRONTEND_URL` must equal your production Vercel origin exactly (`https://…`,
no trailing slash), or every API call from the new deploy is blocked by CORS. **Update
`FRONTEND_URL` on the backend host whenever the frontend URL changes** (e.g. after the
first Vercel deploy, or when you attach a custom domain):

```powershell
fly secrets set FRONTEND_URL="https://your-app.vercel.app"
```

The backend redeploys automatically. After that, browser requests from your Vercel origin
are allowed; all others are blocked.

`FRONTEND_URL_EXTRA` accepts a **comma-separated** list of additional allowed origins —
use it for a custom domain, and during the host cutover to keep the old origin alive
alongside the new one:

```powershell
fly secrets set FRONTEND_URL_EXTRA="https://fjalingo.com"
```

### Production domain (live values)

The generic host above is `*.fly.dev`; production runs on **fjalingo.com**. The API is
served from **api.fjalingo.com** (a CNAME to the Fly app), which shares the frontend's
registrable domain — so auth cookies are first-party (`SameSite=Lax`) and work in
Safari/iOS. The live values:

| Where | Variable | Value |
|-------|----------|-------|
| Fly (backend) | `FRONTEND_URL` | `https://fjalingo.com` |
| Fly (backend) | `FRONTEND_URL_ALT` | `https://www.fjalingo.com` |
| Vercel (frontend) | `VITE_API_URL` | `https://api.fjalingo.com/api` |
| Vercel (frontend) | `VITE_SITE_URL` | `https://fjalingo.com` |

**Vite envs are baked at build time** — after changing `VITE_API_URL` or `VITE_SITE_URL`
on Vercel you must **Redeploy**, or the change has no effect (the old value stays in the
bundle). Changing `FRONTEND_URL` on Fly restarts the backend automatically.

---

## Step 5: Schedule the daily cron

The nightly maintenance job (seeds `word_of_the_day`, grants streak freezes, resets
missed streaks, ends league seasons) runs via **GitHub Actions** — there is no in-app
scheduler and Fly does not run cron for us. The controller is idempotent (safe to run
more than once a day) and evaluates each user's "day" in that user's own timezone, so
the job only needs to fire once, some time after local midnight.

- **Workflow:** [`.github/workflows/cron-daily.yml`](.github/workflows/cron-daily.yml)
- **Endpoint:** `POST https://api.fjalingo.com/api/cron/daily`
- **Header:** `x-cron-secret: <CRON_SECRET>` (must equal the `CRON_SECRET` Fly secret)
- **Schedule:** `0 3 * * *` — **03:00 UTC daily**. GitHub `schedule` cron is UTC and
  does not observe DST. Europe/Tirane is UTC+1 in winter / UTC+2 in summer, so local
  midnight is 23:00 UTC (winter) / 22:00 UTC (summer). 03:00 UTC = 04:00 local winter /
  05:00 local summer — safely past local midnight year-round, with margin for late runs.
- Any non-2xx response (e.g. `403` on a wrong/missing secret) fails the workflow loudly.

### Required GitHub repo secret

The workflow needs a **`CRON_SECRET` repository secret** whose value **equals the
`CRON_SECRET` Fly secret** the backend checks. Add it under **GitHub → repo → Settings →
Secrets and variables → Actions → New repository secret**, name `CRON_SECRET`. (This is
in addition to the Fly secret from Step 2b — the workflow can't read Fly's secrets.)

### Manual run / backfill a missed day

The workflow has a `workflow_dispatch` trigger — run it by hand from **GitHub → Actions →
"Daily cron" → Run workflow**. Because the job is idempotent, running it after a missed
night backfills that day (seeds today's `word_of_the_day` if none exists, catches up
streak resets). Equivalent one-off curl (needs the raw secret locally, not the repo one):

```bash
curl -X POST https://api.fjalingo.com/api/cron/daily \
  -H "x-cron-secret: $CRON_SECRET"
```

> A separate GitHub Actions workflow (`.github/workflows/sitemap.yml`) regenerates
> `frontend/public/sitemap.xml` daily from the words table and commits it; the commit triggers
> a Vercel redeploy. It needs `DATABASE_URL` and `SITE_URL` repo secrets.

---

## Step 6: Verify end-to-end

1. Open your Vercel URL — Fjalingo UI loads.
2. Search, word of the day, register/login, quiz, leaderboard.
3. Admin: `/admin` with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
4. Smoke test:

```powershell
cd backend
node scripts/smoke-test.js https://albanian-dictionary-app.fly.dev
```

5. In browser DevTools → Network: API calls go to `*.fly.dev/api/...` with no CORS errors.

---

## Secrets checklist (set on Fly before first deploy)

| Secret | Required | Purpose |
|--------|----------|---------|
| `NODE_ENV` | Yes | Must be `production` on Fly |
| `DATABASE_URL` | Yes | Supabase/Postgres pooled connection string (`sslmode=require`) |
| `JWT_SECRET` | Yes | Signs auth tokens; use `openssl rand -hex 32` |
| `FRONTEND_URL` | Yes | Production frontend (Vercel) origin for CORS (e.g. `https://your-app.vercel.app`) |
| `CRON_SECRET` | Yes | Shared secret for the daily cron (`x-cron-secret` header on `POST /api/cron/daily`); `openssl rand -hex 32`. **Also add the same value as a GitHub `CRON_SECRET` repo secret** so the `cron-daily.yml` Action can authenticate — see Step 5. |
| `PADDLE_ENVIRONMENT` | Yes | `sandbox` until live billing; `production` after Paddle verification. Must be exactly `sandbox` or `production`. Single source of truth for the checkout environment — the frontend reads it from `/billing/checkout-config`, there is **no** frontend Paddle env var. Set `production` alongside the live `PADDLE_CLIENT_TOKEN` / price ids. |
| `PADDLE_CLIENT_TOKEN` | Yes | Paddle client-side token for checkout |
| `PADDLE_PRICE_ID_ANNUAL` | Yes | Paddle price ID for the €25/year Premium plan (the hero). Falls back to legacy `PADDLE_PREMIUM_PRICE_ID` if set, so an un-renamed secret keeps working. |
| `PADDLE_PRICE_ID_MONTHLY` | Recommended | Paddle price ID for the €5/month Premium plan (the anchor). If unset, the pricing page shows annual-only. |
| `PADDLE_WEBHOOK_SECRET` | Yes | Verifies Paddle webhook signatures |

Do **not** echo real values in logs, commits, or docs.

---

## Updating the backend

### Automated (default): merge to `main`

The backend deploys **automatically** via `.github/workflows/deploy-backend.yml`. You do
not run `fly deploy` by hand for normal releases.

**What triggers a deploy.** When a push lands on `main`, CI (`.github/workflows/ci.yml`,
workflow name **CI**) runs first. The deploy workflow starts only *after CI completes on
`main`* (GitHub's `workflow_run` event) and runs only if **CI succeeded** — a red CI run
deploys nothing. It then checks whether that commit changed anything under `backend/` or
`fly.toml`; if not (e.g. a frontend- or docs-only merge), it skips. When it does deploy it
runs `flyctl deploy --remote-only`. Migrations are **not** a separate step: `fly.toml`'s
`[deploy] release_command = "npm run migrate"` applies pending migrations as part of the
release, before the new version serves traffic. If the release command fails, the deploy
fails and the previous version keeps serving. Finally a smoke step fails the workflow
unless `https://albanian-dictionary-app.fly.dev/api/health` answers **200**.

> **Why this exists.** Previously the frontend auto-deployed on Vercel while the backend
> only moved when someone ran `fly deploy` manually. A merge that shipped a new frontend
> feature against a not-yet-deployed backend endpoint 404'd in production (the landing
> demo, commit `72f8bfb`). This workflow closes that gap: backend code merged to `main`
> ships without a human remembering to deploy.

**Required secret.** The workflow authenticates to Fly with a single repository secret,
**`FLY_API_TOKEN`**. Create a deploy-scoped token (least privilege — it can deploy this
app, nothing else) and add it under **GitHub → repo → Settings → Secrets and variables →
Actions → New repository secret**, name `FLY_API_TOKEN`:

```powershell
fly tokens create deploy -x 999999h -a albanian-dictionary-app
```

Copy the entire output including the `FlyV1` prefix. If the token is missing or invalid,
the deploy step fails loudly (no silent skip). Rotate by creating a new token and updating
the secret.

### Manual (fallback): when the workflow is unavailable

If GitHub Actions is down, the token is being rotated, or you need an out-of-band deploy,
deploy by hand from the **repo root**:

```powershell
fly deploy
```

This is the same command the workflow runs. The release command still applies migrations,
and Fly performs rolling deploys with zero downtime when health checks pass at
`/api/health`. Confirm afterward:

```powershell
curl https://albanian-dictionary-app.fly.dev/api/health
```

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Words don't load; 404 on `/words/...` | Vercel `VITE_API_URL` must end with `/api`. Redeploy on Vercel after changing it (env changes need a fresh build). |
| Hard refresh on `/kerko` or `/admin` returns 404 | `frontend/vercel.json` rewrite is missing or not deployed; redeploy. |
| CORS errors in browser | `FRONTEND_URL` on the backend host must exactly match the Vercel origin (https, no trailing slash). |
| Health returns `"db": "fail"` | `DATABASE_URL` correct; Supabase pooler URL with SSL; migrations run. |
| Health slow or timeout | Fly machine region (`primary_region = "ams"` in `fly.toml`) should be near EU users and Supabase region. |
| App name taken on Fly | Change `app` in `fly.toml`, run `fly apps create <new-name>`, deploy again. |

---

## Summary

| Part | Service | Role |
|------|---------|------|
| Frontend | Vercel | Serves the React app; always on |
| Backend | Fly.io | Node API; always-on container in `ams` (Amsterdam) |
| Database | Supabase Postgres | Managed PostgreSQL; always on |

After deployment, the app is publicly available. Admin credentials live only in Fly secrets and your password manager — never in the repo.
