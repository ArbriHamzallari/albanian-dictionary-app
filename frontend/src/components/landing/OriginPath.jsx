import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Parrot from '../mascot/Parrot.jsx';
import { t } from '../../i18n/index.js';

// The five origin worlds in the FIXED landing order (M4 decode §3) — anglisht is the
// free world, the rest are premium. gjermanisht is reserved in the taxonomy but has no
// content yet, so it is not part of the path.
const LANDING_ORDER = ['anglisht', 'turqisht', 'neolatine', 'greqisht', 'sllavisht'];
const FREE_ORIGIN = 'anglisht';

const ORIGIN_MASCOT_STATES = {
  anglisht: 'wave',
  turqisht: 'think',
  neolatine: 'cheer',
  greqisht: 'idle',
  sllavisht: 'sleep',
};

// Teaser = first sentence of the origin's intro narrative.
const firstSentence = (text) => {
  if (!text) return '';
  const match = text.match(/^[^.!?]*[.!?]/);
  return match ? match[0] : text;
};

const glyphFree = 'bg-brand-green text-white shadow-[0_3px_0_0_var(--brand-green-dark)]';
const glyphPremium =
  'bg-accent-purple text-white shadow-[0_3px_0_0_color-mix(in_srgb,var(--accent-purple)_70%,var(--ink))]';

const PathRow = ({ index, isFree, isLast, children }) => (
  <div className="relative grid grid-cols-[2.75rem_1fr] gap-4 sm:grid-cols-[3.5rem_1fr] sm:gap-6">
    {/* connecting line behind the number circles (not on the last row) */}
    {!isLast && (
      <span
        aria-hidden="true"
        className="absolute left-[1.375rem] top-12 h-[calc(100%-1.5rem)] w-0.5 -translate-x-1/2 bg-line dark:bg-dark-border sm:left-7"
      />
    )}
    <div
      className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-lg font-black sm:h-14 sm:w-14 sm:text-xl ${
        isFree ? glyphFree : glyphPremium
      }`}
    >
      {index}
    </div>
    <div className="pb-6">{children}</div>
  </div>
);

const OriginCard = ({ origin, isFree }) => {
  const mascotState = ORIGIN_MASCOT_STATES[origin.code] || 'idle';
  return (
    <Link
      to={`/origjina/${origin.code}`}
      className="card card-hover block"
    >
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {origin.era_sq && (
                <p className="text-xs font-bold uppercase tracking-wide text-accent-purple">
                  {origin.era_sq}
                </p>
              )}
              <h3 className="mt-0.5 text-lg font-black text-heading dark:text-dark-text sm:text-xl">
                {origin.name_sq}
              </h3>
            </div>
            <span
              className={`flex-shrink-0 rounded-pill px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide ${
                isFree
                  ? 'bg-brand-green/15 text-brand-green'
                  : 'bg-accent-purple/15 text-accent-purple'
              }`}
            >
              {isFree ? t('home.path.freeBadge') : t('home.path.premiumBadge')}
            </span>
          </div>

          <p className="mt-2 text-sm text-muted dark:text-dark-muted">
            {firstSentence(origin.intro_sq)}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-brand-green">
              {origin.word_count} {t('home.path.wordsLabel')}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-green">
              {t('home.path.open')} <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Small illustration mascot panel on the right side */}
        <div className="hidden sm:flex flex-shrink-0 bg-cloud dark:bg-dark-bg/20 p-2.5 rounded-2xl border border-line dark:border-dark-border items-center justify-center">
          <Parrot state={mascotState} size={70} />
        </div>
      </div>
    </Link>
  );
};

const SkeletonCard = () => (
  <div className="card">
    <div className="h-4 w-24 animate-pulse rounded bg-line dark:bg-dark-border" />
    <div className="mt-2 h-6 w-40 animate-pulse rounded bg-line dark:bg-dark-border" />
    <div className="mt-3 h-4 w-full animate-pulse rounded bg-line dark:bg-dark-border" />
  </div>
);

// Section 3 (M4 decode): "a real curriculum, not a toy" — the five-world numbered path,
// the key section. Live counts + FREE/PREMIUM badges from the origins endpoint; a fixed
// five-row skeleton renders while data loads so there is no layout shift.
const OriginPath = ({ origins, loading }) => {
  const byCode = new Map((origins || []).map((o) => [o.code, o]));
  const ordered = LANDING_ORDER.map((code) => byCode.get(code)).filter(Boolean);

  return (
    <section
      id="rruga"
      className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14 sm:px-6"
    >
      <div className="mb-10 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-brand-green">
          {t('home.path.eyebrow')}
        </p>
        <h2 className="mt-2 text-2xl font-black text-heading dark:text-dark-text sm:text-3xl">
          {t('home.path.heading')}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold text-muted dark:text-dark-muted sm:text-base">
          {t('home.path.lead')}
        </p>
      </div>

      <div>
        {loading
          ? LANDING_ORDER.map((code, i) => (
              <PathRow
                key={code}
                index={i + 1}
                isFree={code === FREE_ORIGIN}
                isLast={i === LANDING_ORDER.length - 1}
              >
                <SkeletonCard />
              </PathRow>
            ))
          : ordered.map((origin, i) => (
              <motion.div
                key={origin.code}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <PathRow
                  index={i + 1}
                  isFree={origin.code === FREE_ORIGIN}
                  isLast={i === ordered.length - 1}
                >
                  <OriginCard origin={origin} isFree={origin.code === FREE_ORIGIN} />
                </PathRow>
              </motion.div>
            ))}
      </div>
    </section>
  );
};

export default OriginPath;
