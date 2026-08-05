// PRICE-3: the shared premium presentation constants — the two plans and the
// Free/Premium feature lists — used by the /premium page (Premium.jsx) and the
// landing plan-preview dialog (PricingBanner.jsx) so the two surfaces can never
// drift apart on price, plan name, or what Premium claims to include.
//
// These are i18n keys and plan ids only. Nothing here decides entitlement or
// touches checkout: the Paddle price id for a plan is still resolved at click
// time from /billing/checkout-config, keyed by the same `id` below.

// PRICE-2 dual pricing: annual is the hero (pre-selected on /premium, carries the
// savings badge), monthly is the visible anchor.
export const PREMIUM_PLANS = [
  {
    id: 'annual',
    hero: true,
    nameKey: 'premium.plans.annualName',
    priceKey: 'premium.plans.annualPrice',
    subKey: 'premium.plans.annualPerMonth',
    badgeKey: 'premium.plans.savingsBadge',
  },
  {
    id: 'monthly',
    hero: false,
    nameKey: 'premium.plans.monthlyName',
    priceKey: 'premium.plans.monthlyPrice',
    subKey: null,
    badgeKey: null,
  },
];

// The feature lists below are i18n key suffixes only — the copy itself lives in
// sq.json under premium.compare.*. Each entry is annotated with the backend gate
// that makes it true, so the list stays auditable instead of aspirational. Do not
// add an entry without a gate to point at.
//
//   unlimited  — lessonController.js FREE_DAILY_LESSON_LIMIT = 5 (checkFreeAccess);
//                free users are capped per day, premium is not.
//   allContent — lessonController.js checkFreeAccess: units with is_premium_unit
//                return 402 PREMIUM_REQUIRED for free users.
//   mistakes   — routes/lessons.js GET /practice-mistakes is behind requirePremium.
//   freeze     — cronController.js grants 2 streak freezes per calendar month, and
//                only to entitlements with tier='premium' and an active period.
//   friendsV2  — routes/friends.js and routes/chat.js both apply requirePremium to
//                the entire router. COPY-2 retired the previous `friends` key: its
//                copy advertised a family feature that exists nowhere in the code,
//                and listed "sfidat" as premium when routes/quests.js carries only
//                `authenticate` — quests are free. The old key stays in sq.json as
//                the copy gate's reference; do not point this list back at it.
export const PREMIUM_FEATURE_KEYS = [
  'unlimited',
  'allContent',
  'mistakes',
  'freeze',
  'friendsV2',
];

// The free tier's own list, as shown on /premium.
//   dictionary     — GET /words/search is public (optionalAuthenticate), but see the
//                    open item in the COPY-2 PR: it is still capped at
//                    FREE_DAILY_SEARCH_LIMIT = 5/day, which this copy does not say.
//   history        — routes/public.js origin content is ungated.
//   dailyLessons   — the FREE_DAILY_LESSON_LIMIT = 5 cap above, from the free side.
//   streak         — streaks, quests and word-of-the-day carry no premium gate;
//                    routes/quests.js is `authenticate` only, so "sfida" belongs
//                    here in the free column and not in the premium one.
//
// LEADERBOARD-3 dropped the leaderboard line from this column entirely. Both keys it
// could point at are now retired: `leaderboard` ("Renditja + Liga Bronx", retired by
// COPY-2) and `leaderboardV2` ("Shikon renditjen" — "views the leaderboard"), which
// COPY-2 wrote to say free users read the board without placing on it. That stopped
// being true when rankSql.js lost its entitlements join: ranking is no longer tied to
// plan, so there is no free/premium leaderboard distinction left for a comparison
// table to draw. Both keys stay in sq.json as the copy gate's reference; do not point
// this list back at either.
export const FREE_FEATURE_KEYS = [
  'dictionary',
  'history',
  'dailyLessons',
  'streak',
];
