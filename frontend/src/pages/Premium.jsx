import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Check, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import PremiumCheckoutButton from '../components/PremiumCheckoutButton.jsx';
import Card from '../components/ui/Card.jsx';
import Heading from '../components/ui/Heading.jsx';
import Seo from '../components/Seo.jsx';
import api from '../utils/api.js';
import { useAuth, useHasUnlimitedAccess } from '../context/AuthContext.jsx';
import { t } from '../i18n/index.js';

// PRICE-2 dual pricing: annual is the hero (pre-selected, savings badge), monthly
// is the anchor. Prices are shown from copy; the chosen plan's Paddle price id is
// resolved at checkout from /billing/checkout-config.
const PLANS = [
  { id: 'annual', nameKey: 'premium.plans.annualName', priceKey: 'premium.plans.annualPrice', subKey: 'premium.plans.annualPerMonth', badgeKey: 'premium.plans.savingsBadge' },
  { id: 'monthly', nameKey: 'premium.plans.monthlyName', priceKey: 'premium.plans.monthlyPrice', subKey: null, badgeKey: null },
];

// PAY-4: the two Paddle-hosted management actions. The session is minted ON CLICK, never
// on page load — Paddle documents these links as temporary and says not to cache them,
// so a link fetched at render would be stale by the time anyone pressed it. The URL is
// used immediately and kept nowhere: no state, no storage, no DB.
const ManageActions = () => {
  // Which action is in flight ('cancel' | 'payment' | null), so only that button shows a
  // spinner and both stay disabled while a session is being created.
  const [pending, setPending] = useState(null);
  const [failed, setFailed] = useState(false);

  const openPortal = async (action) => {
    setPending(action);
    setFailed(false);
    try {
      const res = await api.post('/billing/portal-session');
      const urls = res.data?.urls || {};
      // Prefer the deep link; the portal overview is a valid fallback when Paddle
      // returns no per-subscription entry (e.g. an already-canceled subscription).
      const target = action === 'cancel'
        ? (urls.cancel || urls.overview)
        : (urls.updatePaymentMethod || urls.overview);

      if (!target) throw new Error('portal session returned no usable url');

      // Full navigation: these are Paddle-hosted pages, not part of this SPA.
      window.location.assign(target);
    } catch (err) {
      // Calm, actionable message — never the raw error. Logged so a real outage is
      // diagnosable rather than looking like a dead button.
      console.error('Premium: portal session failed:', err?.response?.status ?? err);
      setFailed(true);
      setPending(null);
    }
  };

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => openPortal('payment')}
          disabled={pending !== null}
          className="btn-secondary text-sm disabled:opacity-60"
        >
          {pending === 'payment' ? t('TODO_SQ_premium_manage_opening') : t('TODO_SQ_premium_update_payment')}
        </button>
        <button
          type="button"
          onClick={() => openPortal('cancel')}
          disabled={pending !== null}
          className="text-sm font-bold text-muted underline hover:text-ink disabled:opacity-60 dark:text-dark-muted dark:hover:text-dark-text"
        >
          {pending === 'cancel' ? t('TODO_SQ_premium_manage_opening') : t('TODO_SQ_premium_cancel_subscription')}
        </button>
      </div>

      {failed && (
        <p role="alert" className="mt-3 text-sm font-semibold text-accent-coral">
          {t('TODO_SQ_premium_manage_error')}
        </p>
      )}
    </div>
  );
};

// PAY-3: what an active subscriber sees in place of the old bare "Active" badge —
// which plan they are on, when it renews, and a calm warning while Paddle retries a
// failed payment. Everything here is rendered only when the server actually supplied
// it: an unknown plan or a missing period end omits its line rather than inventing one.
// PAY-4 adds the manage actions below it.
const SubscriptionPanel = ({ subscription }) => {
  const pastDue = subscription?.status === 'past_due';
  const planName = subscription?.plan
    ? t(`premium.plans.${subscription.plan}Name`)
    : null;
  const renewsAt = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;
  const renewsValid = renewsAt && !Number.isNaN(renewsAt.getTime());

  return (
    <div className="mt-2">
      <span className="inline-flex items-center gap-2 rounded-pill bg-brand-green/15 px-4 py-2 text-sm font-extrabold text-brand-green">
        <Check className="w-4 h-4" aria-hidden="true" /> {t('premium.active')}
      </span>

      {(planName || renewsValid) && (
        <dl className="mt-4 space-y-1 text-sm font-semibold text-muted dark:text-dark-muted">
          {planName && (
            <div className="flex items-center justify-center gap-2">
              <dt>{t('TODO_SQ_premium_manage_plan_label')}</dt>
              <dd className="text-ink dark:text-dark-text font-bold">{planName}</dd>
            </div>
          )}
          {renewsValid && (
            <div className="flex items-center justify-center gap-2">
              {/* past_due means the period already lapsed and Paddle is retrying, so
                  the same date is a "renews on" or a "retrying since" depending on state. */}
              <dt>{pastDue ? t('TODO_SQ_premium_manage_period_ended_label') : t('TODO_SQ_premium_manage_renews_label')}</dt>
              <dd className="text-ink dark:text-dark-text font-bold">
                {renewsAt.toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' })}
              </dd>
            </div>
          )}
        </dl>
      )}

      {pastDue && (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 rounded-2xl border border-accent-yellow/40 bg-accent-yellow/10 px-4 py-3 text-left"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-accent-yellow mt-0.5" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink dark:text-dark-text">
            {t('TODO_SQ_premium_past_due_body')}
          </p>
        </div>
      )}

      {/* Only a real Paddle subscription can be managed. Admins and complimentary users
          also reach this panel via isPremium but have no Paddle customer, and would only
          get a 409 — so they see the badge without dead buttons. */}
      {subscription?.tier === 'premium' && <ManageActions />}
    </div>
  );
};

const PlanSelector = ({ selected, onSelect }) => (
  <div className="mb-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('premium.plans.selectAria')}>
    {PLANS.map((p) => {
      const active = selected === p.id;
      return (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onSelect(p.id)}
          className={`relative rounded-2xl border-2 p-4 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green ${
            active
              ? 'border-brand-green bg-brand-green/5'
              : 'border-line dark:border-dark-border hover:border-brand-green/50'
          }`}
        >
          {p.badgeKey && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-pill bg-brand-green px-2 py-0.5 text-[10px] font-black uppercase text-white">
              {t(p.badgeKey)}
            </span>
          )}
          <p className="text-xs font-bold uppercase text-muted dark:text-dark-muted">{t(p.nameKey)}</p>
          <p className="mt-1 text-xl font-black text-heading dark:text-dark-text">{t(p.priceKey)}</p>
          {p.subKey && <p className="text-xs font-semibold text-muted dark:text-dark-muted">{t(p.subKey)}</p>}
        </button>
      );
    })}
  </div>
);

// PRICE-1: public pricing page (Paddle review + the /en explainer link here). Renders
// logged-out. What's free, what's premium, the price, cancel-anytime, and the refund/
// terms links are all on this one page — no separate /cmimet.
// Comparison rows follow the Free/Premium split in albanian-dictionary-app/CLAUDE.md §10
// (free-premium.md is the intended spec but is not yet in the repo). Strings are
// TODO_SQ placeholders authored by ChatGPT + Arbri (Prompt O / COPY-3).
const FREE_KEYS = ['dictionary', 'history', 'dailyLessons', 'streak', 'leaderboard'];
const PREMIUM_KEYS = ['unlimited', 'allContent', 'mistakes', 'freeze', 'friends'];

const Premium = () => {
  const reduceMotion = useReducedMotion();
  const { isLoggedIn } = useAuth();
  // Single source of truth: admins and active-premium/complimentary users all pass;
  // only genuine free users see the upsell.
  const isPremium = useHasUnlimitedAccess();
  const [selectedPlan, setSelectedPlan] = useState('annual'); // annual is the hero
  // PAY-3: only a real subscriber has a subscription to show. Admins and complimentary
  // users also pass isPremium but have no Paddle row — the endpoint returns free/null
  // for them and the panel simply falls back to the plain badge.
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || !isPremium) return;
    let cancelled = false;
    api.get('/billing/subscription')
      .then((res) => {
        if (!cancelled) setSubscription(res.data.subscription || null);
      })
      .catch((err) => {
        // Non-fatal: the badge still renders. Log so a real failure is diagnosable
        // rather than silently degrading to "no details" forever.
        console.error('Premium: subscription fetch failed:', err?.response?.status ?? err);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn, isPremium]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Seo title={t('premium.seoTitle')} description={t('premium.seoDesc')} path="/premium" />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        {/* Pricing hero */}
        <Card padding="lg" className="text-center">
          <Crown className="w-14 h-14 mx-auto mb-4 text-accent-yellow" aria-hidden="true" />
          <p className="text-sm font-black uppercase tracking-wide text-brand-green mb-2">{t('nav.premium')}</p>
          <Heading level={2} className="mb-3">{t('premium.title')}</Heading>
          <p className="text-muted dark:text-dark-muted font-semibold mb-6">{t('premium.hero')}</p>

          {isPremium ? (
            <SubscriptionPanel subscription={subscription} />
          ) : (
            <>
              <PlanSelector selected={selectedPlan} onSelect={setSelectedPlan} />
              {isLoggedIn ? (
                <PremiumCheckoutButton plan={selectedPlan} />
              ) : (
                <Link to="/regjistrohu" className="btn-primary inline-block">
                  {t('premium.freeCta')}
                </Link>
              )}
              <p className="mt-4 text-xs font-semibold text-muted dark:text-dark-muted">{t('premium.cancelAnytime')}</p>
            </>
          )}

          {/* Refund + terms, so a reviewer reaches both in one click from here */}
          <div className="mt-5 flex items-center justify-center gap-4 text-sm font-bold">
            <Link to="/rimbursimi" className="text-fjalingo-green hover:text-fjalingo-green-dark">
              {t('footer.links.refund')}
            </Link>
            <Link to="/kushtet" className="text-fjalingo-green hover:text-fjalingo-green-dark">
              {t('footer.links.terms')}
            </Link>
          </div>
        </Card>

        {/* Falas vs Premium comparison */}
        <div className="grid gap-4 sm:grid-cols-2 mt-8">
          <Card padding="lg">
            <h3 className="mb-4 text-lg font-black text-heading dark:text-dark-text">
              {t('premium.compare.freeTitle')}
            </h3>
            <ul className="flex flex-col gap-3">
              {FREE_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2 font-semibold text-heading dark:text-dark-text">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-green" aria-hidden="true" />
                  <span>{t(`premium.compare.free.${key}`)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg" className="border-2 border-accent-yellow/40">
            <h3 className="mb-4 text-lg font-black text-heading dark:text-dark-text">
              <Crown className="mr-1 inline h-5 w-5 text-accent-yellow" aria-hidden="true" />
              {t('premium.compare.premiumTitle')}
            </h3>
            <ul className="flex flex-col gap-3">
              {PREMIUM_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2 font-semibold text-heading dark:text-dark-text">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-yellow" aria-hidden="true" />
                  <span>{t(`premium.compare.premium.${key}`)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default Premium;
