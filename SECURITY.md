# Security Policy

## Reporting a vulnerability

Please report security issues privately to **security@fjalingo.com**.

- Do **not** open a public GitHub issue for security reports.
- Include steps to reproduce, affected endpoint/page, and impact.
- We aim to acknowledge within 3 business days and to keep you updated through
  remediation. Please give us a reasonable window to fix before public disclosure.

Fjalingo is a kid-safe product; reports involving minors' data or the
child-safety controls are treated as highest priority.

## Threat model (brief)

What we defend, and how:

- **Session theft via XSS.** The JWT is stored in an **httpOnly** cookie, so
  page scripts cannot read it; an XSS cannot exfiltrate the token. A tight
  Content-Security-Policy (see below) reduces the XSS surface itself.
- **CSRF.** State-changing requests (`POST`/`PUT`/`PATCH`/`DELETE`) from a
  cookie-authenticated browser must echo a non-HttpOnly CSRF cookie
  (`fjalingo_csrf`) in the `x-fjalingo-csrf` header (double-submit-cookie).
  Cookies are `SameSite=Lax`, which also blocks cross-site form posts.
- **Privilege escalation.** Admin role travels in signed JWT claims; admin
  routes are gated server-side. Every admin mutation is recorded in an
  append-only `admin_audit_log` (who, what, when, IP, user agent).
- **Server-authoritative gameplay.** XP, streaks, league standings, quest
  progress, and quiz/lesson grading are computed on the server; the client
  cannot mint rewards.
- **Injection.** All SQL is parameterized; all request bodies are validated with
  Joi. Output to other users is pseudonymous (username + avatar only).
- **Abuse / brute force.** Rate limiting on the API and stricter limits on auth
  endpoints. bcrypt makes offline password cracking expensive.
- **Child safety.** Age-gating, parental consent, private-by-default minor
  profiles, segmented (kids/adults) pseudonymous leaderboards, and a
  profanity/PII filter on user-generated text. See `CLAUDE.md` §14.
- **PII in logs.** Logs reference user UUIDs only — never email, username, or
  tokens.

### Trust boundaries / known limitations

- Refresh-token rotation is currently stateless (no server-side denylist), so a
  refresh token stays valid until expiry. A token store is a planned hardening.
- `SameSite=Lax` cookie auth requires the web app and API to share a registrable
  domain in production (e.g. `fjalingo.com` + `api.fjalingo.com`).

## Cryptography & auth choices

- **Passwords:** bcrypt, cost factor **12**.
- **Sessions:** JWT (HS256) in cookies. Access token TTL **2h**; refresh token
  TTL **14d**. Cookies are `HttpOnly` (except the CSRF token), `Secure` in
  production, `SameSite=Lax`, `Path=/`.
- **CSRF token:** 24 random bytes (`crypto.randomBytes`), double-submit pattern.
- **Transport:** HTTPS enforced; HSTS (`max-age=15552000; includeSubDomains;
  preload`). Database connections use TLS with certificate verification.
- **Content-Security-Policy:** `default-src 'self'`; scripts limited to `'self'`
  and Paddle (`cdn.paddle.com`, `*.paddle.com`); `style-src 'self'
  'unsafe-inline'` (until styles are externalized); `img-src 'self' data:
  blob:`; `object-src 'none'`; `frame-ancestors 'self'`.
- **Billing:** Paddle webhooks are signature-verified; webhook processing is
  idempotent.

## Supported versions

We ship from `main`. Security fixes are applied to the currently deployed
release.
