# CLAUDE.md — frontend (React 18 + Vite + Tailwind, Vercel)

Applies when touching `frontend/`. Root CLAUDE.md rules still hold.

## Rules
- ALL user-facing strings live in `src/i18n/sq.json` and render via `t()`. Never write
  inline Albanian in JSX; never "improve" existing Albanian. New strings = placeholder
  key `TODO_SQ_<key>`, listed in the PR description for Arbri/ChatGPT.
- Colors come from tokens (`src/styles/tokens.css` / tailwind config). The only green is
  `--brand-green #2BB673`. Every surface must have its `dark:` counterpart using the
  existing dark tokens (`dark-bg`, `dark-card`, `dark-text`, `dark-muted`, `dark-border`)
  and hold AA contrast in both themes (UX-5 standard).
- Reuse `components/ui/*` (Card, Button, Heading, ConfirmDialog) and existing components
  (WordCard, Seo, Parrot mascot) — extend, don't fork. One component per concern.
- Session/auth state goes through `context/AuthContext.jsx` only — one way to establish
  and refresh a session, regardless of provider. localStorage is for guest progress and
  the CSRF echo only; never for logged-in progress or tokens.
- API calls go through `utils/api.js` (it handles credentials + CSRF header). No raw fetch.
- Routes are declared in `App.jsx`. Public content routes (landing, /origjina/*,
  /fjala/*, legal pages) must render meaningful `<Seo>` tags. Dev-only pages (e.g.
  DesignGallery) are registered only when `import.meta.env.DEV`.
- Games: ONE engine (session, progress, scoring display, server submit through the
  existing quiz_sessions path), four presentational renderers. Never build a parallel
  engine. Word-bank tap for fill-in-the-blank — no typed Albanian input anywhere.
- Paddle checkout: the environment + client token come from the backend
  `/billing/checkout-config` response (single source of truth = backend `PADDLE_ENVIRONMENT`);
  there is no frontend Paddle env var. `utils/paddleCheckout.js` calls
  `Paddle.Environment.set('sandbox')` only when `config.environment === 'sandbox'` and omits
  it for `production`. The checkout theme follows the app's current theme (`getTheme()`).
- Keep bundles lean: no new dependencies without stating why in the PR; prefer what's
  already installed.