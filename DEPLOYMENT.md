# Deploy Fjalingo (Netlify + Backend + Database)

This guide gets the app running online for free so users can try all features. You will use:

- **Netlify** – frontend (always available)
- **Render** – backend API (free tier; can spin down after 15 min inactivity; optional ping to keep awake)
- **Neon** or **ElephantSQL** – PostgreSQL (free tier, always on)

**Important:** Netlify only hosts static sites and serverless functions. It does **not** run a persistent Node.js server. The backend must be deployed separately (e.g. Render).

---

## Prerequisites

- A [GitHub](https://github.com) account (repo with this project)
- Accounts (all free): [Netlify](https://netlify.com), [Render](https://render.com), [Neon](https://neon.tech) or [ElephantSQL](https://elephantsql.com)

---

## Step 1: Create the database (Neon or ElephantSQL)

### Option A: Neon

1. Go to [neon.tech](https://neon.tech) and sign up (GitHub is fine).
2. Create a new project (e.g. `fjalingo`), choose a region close to you.
3. After creation, open the project → **Connection details**.
4. Copy the **connection string** (looks like `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
5. Save it somewhere safe; you will use it as `DATABASE_URL` in Step 2.

### Option B: ElephantSQL

1. Go to [elephantsql.com](https://elephantsql.com) and sign up.
2. **Create New Instance** → choose **Tiny Turtle** (free).
3. Name it (e.g. `fjalingo`) and create.
4. Open the instance and copy the **URL** (e.g. `postgres://user:pass@hostname/dbname`).
5. Save it as `DATABASE_URL` for Step 2.

---

## Step 2: Deploy the backend on Render

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. **New +** → **Web Service**.
3. Connect the repo that contains this project (e.g. `albanian-dictionary-app`).
4. Configure (this repo has the backend in a `backend/` folder):
   - **Name:** `fjalingo-api` (or any name).
   - **Region:** Choose closest to your DB and users.
   - **Root Directory:** `backend` (so Render runs all commands from the backend folder).
   - **Runtime:** Node.
   - **Build Command:** `npm install`.
   - **Start Command:** `npm start`.

5. **Environment** (Environment Variables). Add:

   | Key             | Value |
   |-----------------|--------|
   | `NODE_ENV`      | `production` |
   | `PORT`          | `10000` (Render sets this; 10000 is default for free tier) |
   | `DATABASE_URL`  | *(paste the Neon or ElephantSQL connection string)* |
   | `JWT_SECRET`    | *(generate a long random string, e.g. `openssl rand -hex 32`)* |
   | `ADMIN_EMAIL`   | *(your admin email – not the default one)* |
   | `ADMIN_PASSWORD`| *(strong password – never use the default)* |
   | `FRONTEND_URL`  | *(leave empty for now; add after Step 3)* |

   Do **not** commit these values; they stay only in Render’s dashboard.

6. Click **Create Web Service**. Wait for the first deploy to finish.
7. Note the service URL (e.g. `https://fjalingo-api.onrender.com`). The API base URL is that + `/api` (e.g. `https://fjalingo-api.onrender.com/api`).

### Run migrations and seed (one-time)

Render free tier does not give you a long-lived shell. Use one of these:

- **Render Shell (if available):** Open the service → **Shell** tab and run:
  - `npm run migrate`
  - `npm run seed`
- **Local one-time run:** On your machine, create a temporary `backend/.env` with the same `DATABASE_URL` (and optionally `ADMIN_EMAIL`, `ADMIN_PASSWORD`), then run from the **backend** directory:
  - `npm run migrate`
  - `npm run seed`  
  Then remove or secure the local `.env` and do not commit it.

After this, the database has tables and initial data (including the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

### Optional: Keep free-tier backend from sleeping

Render’s free tier spins down after ~15 minutes of no traffic. To reduce cold starts:

- Use [UptimeRobot](https://uptimerobot.com) (free): create an HTTP monitor that hits `https://your-api.onrender.com/api/health` every 10–14 minutes.
- Or use any similar cron/ping service that calls your `/api/health` endpoint.

---

## Step 3: Deploy the frontend on Netlify

1. Go to [app.netlify.com](https://app.netlify.com) and sign in with GitHub.
2. **Add new site** → **Import an existing project** → choose your repo.
3. Configure (the repo includes a `netlify.toml` that sets base = `frontend`, so Netlify may prefill these):
   - **Branch to deploy:** `main` (or your default branch).
   - **Base directory:** `frontend` (or leave empty if using netlify.toml).
   - **Build command:** `npm run build`.
   - **Publish directory:** `dist`.
   - **Environment variables** → **Add variable** (or **Add from .env** if you use a non-committed file):
     - `VITE_API_URL` = `https://your-api.onrender.com/api` (the URL from Step 2, **must end with `/api`**).
     - If you omit `/api`, the frontend will request `/words/...` instead of `/api/words/...` and get 404; words will not load.

4. Save and deploy. Netlify will build and publish the site.
5. Copy the site URL (e.g. `https://your-site-name.netlify.app`).

---

## Step 4: Connect frontend and backend

1. **Render:** Open your web service → **Environment**.
2. Set **FRONTEND_URL** to your Netlify site URL (e.g. `https://your-site-name.netlify.app`). No trailing slash.
3. If you use a custom domain on Netlify later, add it too or use **FRONTEND_URL_EXTRA** (comma-separated) for multiple origins.
4. Save. Render will redeploy; after that, the API will accept requests from your Netlify origin (CORS).

---

## Step 5: Verify

1. Open your Netlify URL. You should see the Fjalingo UI.
2. Try: search, word of the day, opening a word, register/login, quiz, leaderboard.
3. Admin: go to `/admin`, log in with the **ADMIN_EMAIL** and **ADMIN_PASSWORD** you set in Render (not any default from the repo).
4. Optional: run the smoke test against the live API:
   - `cd backend && node scripts/smoke-test.js https://your-api.onrender.com`

---

## Security checklist

- **Never commit** `backend/.env` or `frontend/.env` (they are in `.gitignore`).
- **Production:** Always set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Render; the seed script refuses to create the default admin in production.
- Use a **strong JWT_SECRET** (e.g. `openssl rand -hex 32`).
- Keep **DATABASE_URL** and **JWT_SECRET** only in Render (and optionally in a local `.env` for one-time migrate/seed; never push them).
- CORS is limited to **FRONTEND_URL** (and **FRONTEND_URL_ALT** / **FRONTEND_URL_EXTRA**); only your frontend origin can call the API in a browser.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Words / word of the day don’t load; 404 on `/words/...` | **VITE_API_URL** on Netlify must **end with `/api`** (e.g. `https://xxx.onrender.com/api`). Without it, requests go to `/words/...` instead of `/api/words/...`. Set it in Netlify → Environment variables, then **trigger a new deploy**. |
| Frontend loads but API calls fail | CORS: ensure **FRONTEND_URL** on Render is exactly your Netlify URL (https, no trailing slash). Check browser Network tab for CORS errors. |
| 404 on API routes | **VITE_API_URL** on Netlify must be the full API base (e.g. `https://xxx.onrender.com/api`). Rebuild after changing env vars. |
| “Server not configured” or login fails | **JWT_SECRET** must be set in Render. Redeploy after adding it. |
| DB errors on Render | **DATABASE_URL** correct; migrations run once (Step 2). For Neon, use the string with `?sslmode=require`. |
| Backend “sleeps” | Normal on free tier. Use UptimeRobot (or similar) to ping `/api/health` every 10–14 minutes, or accept the first request after idle being slow. |

---

## Summary

| Part | Service | Role |
|------|---------|------|
| Frontend | Netlify | Serves the React app; always on. |
| Backend | Render | Node API; free tier may spin down when idle. |
| Database | Neon or ElephantSQL | PostgreSQL; always on. |

After deployment, the app is publicly available. Only you (and anyone you give the admin email/password to) can access the admin panel; credentials are not in the repo or in the public docs.
