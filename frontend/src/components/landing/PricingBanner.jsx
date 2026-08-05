import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import SectionShell from '../ui/SectionShell.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import SectionTitle from '../ui/SectionTitle.jsx';
import Button from '../ui/Button.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { PREMIUM_FEATURE_KEYS, PREMIUM_PLANS } from '../../utils/premiumFeatures.js';
import { t } from '../../i18n/index.js';

// Section 10 — Premium (m4-rebrand.md §5.10). Annual (€25/vit) is the hero, monthly
// (€5/muaj) the visible anchor, the ~58% saving stated plainly, accent-purple
// treatment. Prices come from the SAME copy keys the /premium page uses
// (premium.plans.*, "shown from copy" per Premium.jsx) — nothing hardcoded here.
// The one primary action keeps the existing funnel: Link → /premium, where the
// untouched PremiumCheckoutButton runs checkout. Purple is the premium accent; the
// primary button stays brand-green (spec §3.5).

// PRICE-3: the tile is a real control now — a <button>, so Tab reaches it, Enter
// and Space activate it, and it announces itself as a dialog opener. Only the
// border weight differs between hero and non-hero, so both tiles keep the same
// box size in both themes.
const PlanTile = ({ hero, name, price, sub, badge, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    aria-haspopup="dialog"
    className={`relative rounded-2xl bg-paper p-5 text-center transition-transform duration-150 ease-out hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-purple/40 ${
      hero ? 'border-2 border-accent-purple' : 'border-2 border-line hover:border-accent-purple/50'
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
    {/* ink-soft, not accent-purple: purple on paper is 3.25:1 (light) / 4.23:1
        (dark), under AA for text this size. ink-soft holds 5.57 / 5.27. */}
    <p className="mt-3 text-xs font-bold text-ink-soft">
      {t('TODO_SQ_landing_premium_tile_hint')}
    </p>
  </button>
);

// The preview itself reuses ConfirmDialog (Esc, backdrop click, focus-on-open and
// aria-modal all come with it) in an informational mode: the confirm action is the
// primary variant rather than danger, and it just continues into the existing
// /premium funnel — no purchase happens here.
const PlanPreviewDialog = ({ plan, onClose }) => {
  const navigate = useNavigate();
  // Closing nulls `plan` while ConfirmDialog is still playing its exit fade. Keep
  // rendering the plan that was open so the panel fades out at full size instead
  // of collapsing to an empty box first.
  const lastPlan = useRef(null);
  if (plan) lastPlan.current = plan;
  const shown = plan || lastPlan.current;

  if (!shown) return null;

  return (
    <ConfirmDialog
      open={Boolean(plan)}
      title={t('TODO_SQ_landing_premium_preview_title', { plan: t(shown.nameKey) })}
      description={t('TODO_SQ_landing_premium_preview_intro')}
      confirmLabel={t('TODO_SQ_landing_premium_preview_cta')}
      cancelLabel={t('common.close')}
      variant="primary"
      onConfirm={() => navigate('/premium')}
      onCancel={onClose}
    >
      <p className="mt-4 text-sm font-bold uppercase tracking-wide text-ink-soft">
        {t(shown.nameKey)}
      </p>
      <p className="text-2xl font-black text-ink">{t(shown.priceKey)}</p>
      {shown.subKey && (
        <p className="text-sm font-semibold text-ink-soft">{t(shown.subKey)}</p>
      )}

      <ul className="mt-4 flex flex-col gap-2 text-left">
        {PREMIUM_FEATURE_KEYS.map((key) => (
          <li key={key} className="flex items-start gap-2 text-sm font-semibold text-ink">
            <Check
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-green"
              aria-hidden="true"
            />
            <span>{t(`premium.compare.premium.${key}`)}</span>
          </li>
        ))}
      </ul>
    </ConfirmDialog>
  );
};

const PricingBanner = ({ id = 'premium' }) => {
  const [openPlan, setOpenPlan] = useState(null);

  return (
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
          {PREMIUM_PLANS.map((plan) => (
            <PlanTile
              key={plan.id}
              hero={plan.hero}
              name={t(plan.nameKey)}
              price={t(plan.priceKey)}
              sub={plan.subKey ? t(plan.subKey) : null}
              badge={plan.badgeKey ? t(plan.badgeKey) : null}
              onOpen={() => setOpenPlan(plan)}
            />
          ))}
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

      <PlanPreviewDialog plan={openPlan} onClose={() => setOpenPlan(null)} />
    </SectionShell>
  );
};

export default PricingBanner;
