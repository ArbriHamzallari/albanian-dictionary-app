import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { t } from '../../i18n/index.js';

// Section 8 (M4 decode): the one-sentence pricing banner — the whole pricing story in
// a line, linking to /premium. Purple is allowed here (a premium surface, per tokens).
const PricingBanner = () => (
  <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
    <Link
      to="/premium"
      className="group block rounded-3xl border-2 border-dashed border-accent-purple/40 bg-accent-purple/5 px-6 py-8 text-center transition-colors hover:border-accent-purple/70"
    >
      <p className="text-balance text-base font-bold text-heading dark:text-dark-text sm:text-lg">
        {t('home.pricing.text')}
      </p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-accent-purple group-hover:gap-2">
        {t('home.pricing.cta')} <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  </section>
);

export default PricingBanner;
