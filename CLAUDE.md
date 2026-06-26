# CLAUDE.md — Fjalingo v1

> Source of truth for Fjalingo's v1 launch. Read fully before any code change.
> This replaces the prior CLAUDE.md. The locked decisions, child-safety rules, and
> engineering principles still apply — they're restated here in their current form.

---

## 1. What Fjalingo is

A gamified web app (iOS later) that helps Albanians — especially diaspora kids and
heritage young adults — speak **authentic Albanian instead of "Alblish"** (Albanian
mixed with English/foreign loanwords). The mechanic is simple and ownable: take a
borrowed word the user already says, teach the correct Albanian word, wrap it in a
delightful daily habit.

**Positioning (English, internal):** "Speak real Albanian, not Alblish."
**Positioning (Albanian, on the product):** *"Fol shqipen e vërtetë, jo Alblish."*
**Primary payer:** diaspora parents (family use). **Amplifiers:** heritage young adults.
**Top-of-funnel:** homeland students.
**Tone:** friendly, playful, identity-warm. Never preachy or nationalist.

### Language of the product — Albanian first
The entire user-facing app is in **Albanian**. This includes all UI copy, button labels,
empty-state messages, achievement names, quest descriptions, error messages, and email
templates. English appears only in:
- Internal engineering docs (this file, code comments, commit messages, READMEs).
- Loanwords being taught (i.e. the *content* of an exercise, where the loanword and its
  Albanian replacement are the point).
- Admin-only screens used by us, not by users.

Use Albanian diacritics correctly throughout (ë, ç). Never strip them in UI strings.
When a feature name has a working English handle in this doc (e.g. "Spot the Alblish"),
that's the internal name — the user-facing name is the Albanian one given alongside.

---

## 2. State of the codebase (end of Phase 4)

Done and on `main`:
- Phase 0 — security hardening (CORS allowlist, DB TLS verified, debug logger removed,
  public DB dump purged + secrets rotated).
- Phase 1 — server-authoritative quiz scoring (client cannot mint XP).
- Phase 2A — database on Supabase managed Postgres. **Backend still on Render free tier
  — this is the cold-start problem; v1 Phase 1 below fixes it.**
- Phase 3 — Paddle sandbox billing + entitlements + idempotent webhooks.
- Phase 4 — child-safety social: age/country/consent fields, blocks, reports, friends-only
  pseudonymous chat with profanity+PII filter, pseudonymous segmented leaderboard.

What does NOT yet exist and v1 must build:
- A real curriculum (units → lessons → exercises). Today we have a flat `words` table and
  a single multiple-choice quiz type.
- The three lesson types: Spot-the-Alblish (hero), Translation, Fill-in-the-blank.
- Onboarding flow (age-gated signup → avatar → first lesson).
- Streak freezes, daily quests, 3-tier weekly league.
- Practice Mistakes (spaced repetition of words the user got wrong).
- Real visual design — current UI reads as a generic Tailwind shell.
- Mascot — the Fjalingo Parrot is a logo, not yet a character with states.

---

## 3. Locked decisions — do NOT relitigate

- **No language rewrite.** Node/Express stays. TypeScript is added incrementally if at all.
- **Supabase path A only** (managed Postgres). No Supabase Auth/Realtime in v1.
- **Paddle for billing.** Single SKU: **€25 / year Premium.** Sandbox-only until
  `fjalingo.al` is verified with Privacy / Terms / Refund / Children's Privacy pages.
- **No hearts. No lives. No gems.** Punitive mechanics and a virtual currency are out of
  scope for a kid-safe single-SKU product. Gamification rewards = XP, streaks, achievements,
  league rank, cosmetic avatar items only.
- **One paid tier**, not Super/Max. Premium = the full product; Free = a genuine, useful taster.

---

## 4. The hero mechanic — *"Gjej fjalën e huazuar"* (internal: Spot the Alblish)

This is the user-facing name everywhere in the product: **"Gjej fjalën e huazuar"**.
Use the English handle only in code identifiers, internal docs, and analytics events.

Fjalingo is not Duolingo-for-Albanian. The single mechanic that no competitor owns,
and that defines us, is:

> A short sentence appears: **"Kemi një meeting të rëndësishëm nesër."**
> User taps the borrowed word ("meeting").
> The screen reveals the authentic Albanian: **"Kemi një takim të rëndësishëm nesër."**
> A one-line "Pse ka rëndësi" card appears (user-facing label; internal handle: *why_it_matters*):
> *"'meeting' hyri nga anglishtja pas viteve '90. 'takim' është fjala jonë — ajo që përdorte gjyshja."*

This is the hero exercise type. Every unit must contain *"Gjej fjalën e huazuar"*
exercises. Other lesson types support it. The **"Pse ka rëndësi"** line is **authored
content in Albanian**, written when each word is added — it is the brand, not generative
output. Do not use AI to generate these in v1.

---

## 5. Curriculum structure

Replace the flat `words` model with a three-level hierarchy.

- **Unit** — themed loanword domain. Examples: *Technology Alblish*, *Business Alblish*,
  *Social Media*, *Daily Speech*, *Food & Drink*, *Family*, *School*, *Travel*, *Sports*,
  *Money & Shopping*. Each unit has a title, short description, icon, color, and order.
- **Lesson** — a small bundle of 5–8 exercises that drill one theme inside a unit
  (e.g. *Office words 1*, *Office words 2*). Lessons have an order within their unit and
  unlock sequentially as the user passes the previous one.
- **Exercise** — one of the three lesson types, defined below. An exercise references one
  word pair (loanword ↔ authentic Albanian) and optionally a sentence and distractors.

v1 launch target: **8–12 units, 4–6 lessons per unit, ~30 word pairs per unit.**
Content is the gating task; mechanics are the cheap part.

---

## 6. The three v1 lesson types

User-facing names are Albanian. Internal handles (used in code, `exercises.type`
enum, analytics, and these docs) stay in English. Server-graded for all three.
Client submits answers; the server grades against the authoritative answer stored
on the exercise row. Never trust client-supplied correctness.

| Internal handle  | User-facing name           | What it is                                                   |
|------------------|----------------------------|--------------------------------------------------------------|
| `spot_alblish`   | *Gjej fjalën e huazuar*    | The hero. Sentence with a loanword; user taps it.            |
| `translation`    | *Zgjidh fjalën e saktë*    | Show the loanword; pick the correct Albanian from 4 options. |
| `fill_blank`     | *Plotëso vendin bosh*      | Sentence with a missing word; pick the correct one of 4.     |

1. **`spot_alblish` — *Gjej fjalën e huazuar* (hero).** A sentence containing a loanword.
   User taps the loanword. Reveal the corrected sentence and the *"Pse ka rëndësi"* line.
2. **`translation` — *Zgjidh fjalën e saktë*.** Show the loanword (or a short sentence
   containing it). User picks the correct Albanian replacement from 4 options.
   Distractors come from the same unit so they're plausible.
3. **`fill_blank` — *Plotëso vendin bosh*.** A sentence with one Albanian word missing.
   User picks the right word from 4 options. (Typed-answer variant is post-v1; keep
   input deterministic for now.)

Each lesson interleaves all three types. End-of-lesson screen: XP earned, streak status,
mascot celebration, *"Vazhdo"* CTA.

---

## 7. The daily engagement loop

What brings users back tomorrow:
- **Streak** *(Seria ditore)* — consecutive days with at least one completed lesson (or
  *Fjala e Ditës*). Day boundary = user's local timezone (record it on the user; reset uses it).
- **Streak freeze** *(Mburoja e serisë)* — Premium-only. 2 freezes per month.
  Auto-spent when the user misses a day.
- **Word of the Day** *(Fjala e Ditës)* — free for everyone, every day, mascot delivers it
  on the dashboard.
- **Daily Quest** *(Sfida e ditës)* — one quest per day (e.g. *"Përfundo 2 mësime sot"* /
  *"Fito 50 XP sot"*). Free users see and complete it. Weekly *(sfidat javore)* and
  monthly *(sfidat mujore)* quests are Premium.
- **3-tier weekly league** *(Liga javore)* — Bronxhi → Argjendi → Ari (Bronze → Silver →
  Gold). Top 5 of each tier promote at week end; bottom 5 demote. Free users participate;
  their natural XP cap (from daily limits) keeps them in lower tiers without us
  hard-walling them out. **Pseudonymous; respects `leaderboard_opt_out`; segmented
  (kids/adults) per Phase 4 rules.**

Achievements *(Arritjet)* unlock silently as criteria are met (streak milestones,
lessons completed, words mastered, league promotions) and show on the profile.

---

## 8. Practice Mistakes — *"Përsërit gabimet"* (Premium)

Whenever a user gets an exercise wrong, the underlying word pair goes into a per-user
review queue with a `due_at` timestamp using simple spaced repetition (1 day → 3 days →
1 week → 2 weeks). The *Përsërit gabimet* lesson pulls overdue items first. **Premium
only** because it's the highest-retention feature and a clear "if I take this seriously,
I pay" moment.

---

## 9. Onboarding flow (must feel effortless)

Smooth, fast, no friction. **All copy in Albanian.**

1. **Splash** — animated Parrot waving + *"Fol shqipen e vërtetë, jo Alblish."*
   Primary CTA: *"Fillo"* — no signup required for the first lesson preview.
2. **First taste** *(Provo një shembull)* — no account. One *Gjej fjalën e huazuar*
   exercise, fully interactive, so the user feels the product before being asked anything.
3. **Why are you here?** — *"Pse je këtu?"* Single-screen choice:
   *"Për veten"* / *"Për fëmijën tim"* / *"Thjesht kureshtar"*.
   Routes copy later (parent flows vs solo learner).
4. **Quick goal** — *"Sa minuta në ditë?"* Options: *5 / 10 / 15 minuta*. Sets the
   daily quest target.
5. **Age + country** — *"Mosha"* (integer) and *"Vendi"* (flag-list). Per Phase 4 logic,
   this determines `is_minor`, `leaderboard_segment`, and whether parental consent is
   required. If consent is required, show the consent screen with a clear parent-facing
   explanation and a checkbox the parent ticks. Header on that screen:
   *"Kërkohet pëlqimi i prindit"*. v1 = self-attested checkbox; we layer stronger
   verification later.
6. **Username + avatar** — *"Zgjidh emrin tënd"* + *"Zgjidh avatarin"*. Username is
   pseudonymous (do not ask for real name). Avatar is a tappable grid of preset animal
   characters. **No real-name field.**
7. **Account** — *"Krijo llogarinë"*. Email + password. Auto-login on success.
8. **First real lesson** — immediately drop the user into Lesson 1 of Unit 1.
   First XP, first streak (day 1), Parrot celebrates. The "save your progress" prompt
   only appears AFTER a small win.

The whole flow should be ≤90 seconds for an engaged user.

---

## 10. Free vs Premium split (concrete, ship-ready)

Free is generous on purpose. The goal is *daily habit*, then convert. Labels below show
the internal handle and the user-facing Albanian name.

**Free (everyone):**
- *Fjala e Ditës* on the dashboard, every day.
- **Up to 5 lessons per day** (*5 mësime në ditë*) across all units. The first lesson
  *(mësimi i parë)* of each unit is always free.
- All three lesson types: *Gjej fjalën e huazuar*, *Zgjidh fjalën e saktë*, *Plotëso vendin bosh*.
- Basic *Seria ditore* (streak), no freeze.
- One *Sfida e ditës* per day.
- *Klasifikimi* (leaderboard): participate, see rank, earn XP. (Natural cap via the 5/day limit.)
- *Liga javore* (weekly league): participate from Bronxhi.
- Word search *(Kërko fjalë)*: 5 searches/day (already implemented).
- Suggest new words *(Propozo një fjalë)* — community contribution loop.
- Profile, avatar, *Arritjet* (achievements).

**Premium — €25 / year:**
- Unlimited lessons *(mësime pa kufi)*.
- All units fully unlocked.
- ***Mburoja e serisë*** (streak freeze): 2 per month, auto-spent on missed days.
- ***Përsërit gabimet*** (Practice Mistakes — spaced repetition).
- ***Miqtë + bisedat*** (Friends + friend leaderboard + safe chat) — per Phase 4 rules.
- Weekly + monthly quests *(sfidat javore + mujore)* on top of the daily.
- League promotion past Argjendi — Ari (Gold) tier and weekly podium visibility are
  Premium-only.
- Family: up to 4 child profiles under one parent account; parent progress view.
- Cosmetic avatar decorations earned faster.

**Gating rule:** the server enforces every cap. The UI may show the cap, but a `curl`
to the API at limit must return 402 with a `code` the frontend handles. Error message
payloads sent to the frontend are in Albanian; codes stay machine-readable English
(e.g. `DAILY_LESSON_LIMIT_REACHED`, `PREMIUM_REQUIRED`).

---

## 11. Brand & design system

The current UI reads as generic because there's no design language. Fix it with the
following discipline. Match Duolingo's *feel* (chunky, playful, springy, mascot-driven),
not its *colors*.

### 11.1 The Fjalingo Parrot — our mascot

The parrot is a *character with states*, not a logo placed in a corner. Build it once as
an SVG component with named states and reuse it across the app:

- **idle** — gentle 2-step bob, blink every ~4s. Default on dashboard.
- **wave** — hand/wing raise on splash and after sign-up.
- **cheer** — bounce + sparkle on correct answer or lesson complete.
- **think** — hand-to-beak on incorrect answer; speech bubble shows the correction.
- **sleep** — closed eyes if the user hasn't visited today (gentle nudge, not guilt).
- **streak-fire** — small flame next to the parrot when streak ≥ 7.
- **celebrate-big** — confetti + crown on league promotion and 7/30/100/365 streak milestones.

Animate with Framer Motion (already installed). Springs, not eases. Bounce, not slide.
Mascot interactions should be ~300–500ms — quick, never blocking.

### 11.2 Color palette

Lock these as CSS variables (`/frontend/src/styles/tokens.css`) so we never hex-code in
components. Primary green is OURS, not Duolingo's:

```
--brand-green:        #2BB673   /* slightly deeper than Duolingo's, ownable */
--brand-green-dark:   #1F8F58   /* button shadow + pressed state */
--accent-yellow:      #FFC93C   /* streak / WOTD highlights */
--accent-coral:       #FF7A6B   /* hearts-replacement: friendly warning, not punishment */
--accent-purple:      #8B7FF5   /* premium accents only */
--ink:                #1F2933   /* primary text */
--ink-soft:           #5C6A75   /* secondary text */
--paper:              #FFFFFF
--cloud:              #F4F7FB   /* page background */
--line:               #E3E8EF   /* card borders, dividers */
```

If you ever need a green, use `--brand-green`. Do not introduce new shades.

### 11.3 Typography

- **Display + UI:** Nunito (already in use). Weights: 400, 600, 800, 900.
- **Headings ≥ 600.** Buttons and big numbers are 800–900.
- **No more than three text sizes per screen.**

### 11.4 Component patterns

- **Chunky buttons** with a 3px solid bottom shadow in `--brand-green-dark` (or the
  accent dark for non-primary buttons). On press: translate down 3px and remove shadow.
  Radius: 16px. Height: 56px on mobile, 60px on desktop. Bold uppercase or sentence-case
  label — pick one and stick to it.
- **Cards** with 24px radius, soft 1px `--line` border, no heavy drop shadow. Generous
  padding (24px+).
- **Progress** as the central UI metaphor: the dashboard hero is a curved "learning path"
  visualization of the user's current unit, with the next lesson glowing and the Parrot
  pointing to it.
- **Empty states always have the Parrot** plus a one-line message. No "No data" walls.
- **Celebrations**: confetti on lesson complete, streak milestones, league promotions —
  but capped to once per moment so it doesn't get tired.

### 11.5 Motion principles

- Springs everywhere (`{ type: 'spring', stiffness: 300, damping: 22 }` is a good default).
- Tap feedback on every interactive element (~95% scale).
- Page transitions: 200ms fade-up.
- Never animate longer than 600ms.
- Respect `prefers-reduced-motion`: replace with crossfades.

---

## 12. Security & privacy posture for launch

Today (already in place): bcrypt for passwords, `helmet`, rate limiting, parameterized
SQL, Joi validation, DB TLS verified, CORS allowlist, JWT with role claims, fail-closed
child-safety defaults.

**Add for v1 launch:**

- **Move JWT from `localStorage` to httpOnly + Secure + SameSite=Lax cookies.** Today an
  XSS would hand an attacker a long-lived admin token. Cookies remove that class of risk
  entirely. Update frontend `api` client to use `credentials: 'include'`; backend issues
  the cookie on login/register/refresh; admin role still travels in the token claims.
- **Confirm bcrypt cost factor ≥ 12.** Raise if lower.
- **Admin audit log table.** Append-only: who did what, when, from where (admin actions
  on user data, premium grants, content edits). Required for trust + future compliance.
- **HSTS + a tight CSP.** Helmet defaults are good; tighten `script-src` and `style-src`
  once the design system is stable.
- **Children's Privacy notice** as a clearly labelled section in the public Privacy Policy
  on `fjalingo.al` — Paddle verification expects it and GDPR-K/COPPA require it.
- **Don't log PII to console.** Stick to user UUIDs in logs, never emails or names.

Anything in this section is launch-blocking.

---

## 13. Performance & availability

- **Backend must be on an always-on host.** Render free tier sleeps after 15 minutes and
  takes 30s–2min to wake. Move to **Fly.io** or **Railway** (paid). This is v1 Phase 1.
  Health check at `/api/health`. Keep-alive ping from the frontend on app load is a
  band-aid, not a fix.
- **Frontend stays on Vercel.** Enable asset compression and HTTP/2 (default).
- **First contentful paint ≤ 1.5s** on a mid-tier mobile + 4G. Audit with Lighthouse
  before launch. Code-split the lesson player from the marketing splash.
- **Index every join column** used by the leaderboard, friends, and entitlements queries
  (most are already indexed; re-audit before launch).
- **No N+1 queries** in the lesson player. The lesson endpoint returns the unit, the
  lesson, and all exercises in one round trip.

---

## 14. Child-safety hard rules (still in force)

These do not soften. Any change that weakens them must STOP and flag the user.

- Age-gate at signup. EU consent age per country; US under-13 = COPPA.
- Minor profiles are private-by-default. Only display name + avatar are ever public.
  Real name, email, age, and country are NEVER exposed to other users or on leaderboards.
- No open free-text DMs between minors and unknown users. Minor chat = accepted friends
  only, preset phrases + emoji only. Free-text is adult-to-adult only.
- No path from the leaderboard to private contact.
- Block + report + profanity/PII filter on every user-generated text surface.
- Worldwide leaderboard is pseudonymous, supports opt-out, and is segmented (kids/adults).

---

## 15. Engineering principles (follow strictly)

- **Surgical changes.** Minimal, focused diffs. One concern per change.
- **Detective method.** Theory → evidence (repro / targeted log) → confirm → fix.
  Never fix on a hunch.
- **Fix root causes**, not symptoms. Remove temporary logs after.
- **Simple > complex. Don't overengineer.** One correct path, no fallbacks, one way.
- **Fail fast.** Throw on bad preconditions; no silent fallbacks.
- **Clarity over backward-compatibility.**
- **Separation of concerns.**
- **Let TypeScript catch errors** when TS is introduced. Until then, prefer types over
  runtime checks.
- **Read official docs before using an API/library.** Do not assume.
- **No new dependencies** without a clear reason.
- **Server-side everything.** The UI may reflect a state; it must never be the only gate.
- **No PII in logs.**

---

## 16. Commands

Backend: `npm install` · `npm run dev` · `npm run migrate` · `npm run seed` · `npm start` · `npm test`
Frontend: `npm install` · `npm run dev` · `npm run build` · `npm run preview`
Never commit `.env`.

---

## 17. Repo layout (current; do not rearrange)

- `backend/` — Express. `src/controllers`, `src/routes`, `src/middleware`, `src/utils`,
  `database/migrations`, `tests`.
- `frontend/` — React 18 + Vite + Tailwind + Framer Motion. `src/pages`, `src/components`,
  `src/context`, `src/utils`, **add `src/styles/tokens.css` and `src/components/mascot/`
  during v1**.