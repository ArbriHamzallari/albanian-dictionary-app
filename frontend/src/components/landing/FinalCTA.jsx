import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Parrot from '../mascot/Parrot.jsx';
import WordSwap from './manifesto/WordSwap.jsx';
import { t } from '../../i18n/index.js';

// Section 11 — Final CTA (m4-rebrand.md §4, §5.11). Full-width green-gradient moment:
// the approved reprise line, a compact reprise of the RB-2 restoration motif (the same
// WordSwap subcomponent, onGreen tone), a celebratory parrot, and one huge primary CTA
// to /kuizi (same destination as the hero). Nothing else. Gradient built from brand
// tokens (no new colour). Parrot uses "cheer" — celebrate-big auto-fires confetti on
// mount, which would fire below-the-fold on page load; cheer is celebratory without it.

const PAIR_KEYS = [1, 2, 3, 4];

const FinalCTA = ({ id = 'fillo' }) => {
  const pairs = PAIR_KEYS.map((n) => ({
    loan: t(`TODO_SQ_landing_manifesto_pair${n}_loan`),
    albanian: t(`TODO_SQ_landing_manifesto_pair${n}_albanian`),
  }));

  return (
    <section
      id={id}
      className="bg-[linear-gradient(180deg,var(--brand-green-dark)_0%,var(--brand-green-dark)_65%,var(--brand-green)_100%)]"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 md:py-20 lg:py-[120px]">
        <Parrot state="cheer" size={112} />

        <h2 className="mt-6 text-balance text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">
          {t('landing.finalCta.line')}
        </h2>

        <div className="mt-8">
          <WordSwap pairs={pairs} tone="onGreen" />
        </div>

        <Link
          to="/kuizi"
          className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-paper px-10 py-4 text-lg font-extrabold text-brand-green-dark shadow-[0_4px_0_0_rgba(0,0,0,0.18)] transition-transform duration-100 ease-out hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
        >
          {t('home.hero.ctaPrimary')}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default FinalCTA;
