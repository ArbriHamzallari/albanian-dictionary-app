import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionShell from '../ui/SectionShell.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import SectionTitle from '../ui/SectionTitle.jsx';
import Button from '../ui/Button.jsx';
import { t } from '../../i18n/index.js';

// Section 10 — Premium (m4-rebrand.md §5.10). Annual (€25/vit) is the hero, monthly
// (€5/muaj) the visible anchor, the ~58% saving stated plainly, accent-purple
// treatment. Prices come from the SAME copy keys the /premium page uses
// (premium.plans.*, "shown from copy" per Premium.jsx) — nothing hardcoded here.
// The one primary action keeps the existing funnel: Link → /premium, where the
// untouched PremiumCheckoutButton runs checkout. Purple is the premium accent; the
// primary button stays brand-green (spec §3.5).

const PlanTile = ({ hero, name, price, sub, badge }) => (
  <div
    className={`relative rounded-2xl bg-paper p-5 text-center ${
      hero ? 'border-2 border-accent-purple' : 'border border-line'
    }`}
  >
    {badge && (
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-accent-purple px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
        {badge}
      </span>
    )}
    <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">{name}</p>
    <p className="mt-2 text-3xl font-black text-ink">{price}</p>
    {sub && <p className="mt-1 text-sm font-semibold text-ink-soft">{sub}</p>}
  </div>
);

const PricingBanner = ({ id = 'premium' }) => (
  <SectionShell surface="paper" id={id}>
    <div className="mx-auto max-w-3xl rounded-3xl border-2 border-accent-purple/30 bg-accent-purple/5 p-6 shadow-card sm:p-10">
      <div className="flex flex-col items-center text-center">
        <Eyebrow>{t('TODO_SQ_landing_premium_eyebrow')}</Eyebrow>
        <SectionTitle
          className="mt-4"
          align="center"
          title={t('TODO_SQ_landing_premium_title')}
          accentWord={t('TODO_SQ_landing_premium_title_accent')}
          accent="purple"
          subline={t('TODO_SQ_landing_premium_subline')}
        />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <PlanTile
          hero
          name={t('premium.plans.annualName')}
          price={t('premium.plans.annualPrice')}
          sub={t('premium.plans.annualPerMonth')}
          badge={t('premium.plans.savingsBadge')}
        />
        <PlanTile
          name={t('premium.plans.monthlyName')}
          price={t('premium.plans.monthlyPrice')}
        />
      </div>

      <p className="mt-6 text-center text-sm font-semibold text-ink-soft">
        {t('TODO_SQ_landing_premium_free_note')}
      </p>

      <div className="mt-6 flex justify-center">
        <Link to="/premium">
          <Button size="lg">
            {t('home.pricing.cta')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </div>
  </SectionShell>
);

export default PricingBanner;
