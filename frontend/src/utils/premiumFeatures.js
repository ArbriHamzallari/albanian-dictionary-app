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
//
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
//   friends    — routes/friends.js and routes/chat.js both apply requirePremium to
//                the entire router.
export const PREMIUM_FEATURE_KEYS = [
  'unlimited',
  'allContent',
  'mistakes',
  'freeze',
  'friends',
];

// The free tier's own list, as shown on /premium.
//   dictionary   — GET /words/search is public (optionalAuthenticate).
//   history      — routes/public.js origin content is ungated.
//   dailyLessons — the FREE_DAILY_LESSON_LIMIT = 5 cap above, stated from the free side.
//   streak       — streaks/daily challenge/word-of-the-day carry no premium gate.
//   leaderboard  — free users can READ the board; see rankSql.js RANKED_USERS_CTE,
//                  which ranks premium entitlements only, so they are never listed
//                  on it. Flagged for the copy gate (PRICE-3 PR).
export const FREE_FEATURE_KEYS = [
  'dictionary',
  'history',
  'dailyLessons',
  'streak',
  'leaderboard',
];
