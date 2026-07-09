import { motion } from 'framer-motion';
import { Flame, Trophy, Target, PartyPopper } from 'lucide-react';
import { t } from '../../i18n/index.js';

// Section 4 (M4 decode): "learning that feels like playing" — four retention loops
// mapped to what Fjalingo actually has: streaks, achievements, the daily challenge,
// and parrot celebrations. Brand green is the single accent (icons tinted per token).
const FEATURES = [
  { key: 'streaks', icon: Flame, tint: 'text-accent-coral', bg: 'bg-accent-coral/10' },
  { key: 'achievements', icon: Trophy, tint: 'text-accent-yellow', bg: 'bg-accent-yellow/10' },
  { key: 'challenge', icon: Target, tint: 'text-brand-green', bg: 'bg-brand-green/10' },
  { key: 'celebrations', icon: PartyPopper, tint: 'text-accent-purple', bg: 'bg-accent-purple/10' },
];

const FeatureCards = () => (
  <section className="bg-cloud dark:bg-dark-bg/40 px-4 py-14 sm:px-6">
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-brand-green">
          {t('home.features.eyebrow')}
        </p>
        <h2 className="mt-2 text-2xl font-black text-heading dark:text-dark-text sm:text-3xl">
          {t('home.features.heading')}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold text-muted dark:text-dark-muted sm:text-base">
          {t('home.features.lead')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            className="card text-center"
          >
            <span
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg}`}
            >
              <feature.icon className={`h-7 w-7 ${feature.tint}`} aria-hidden="true" />
            </span>
            <h3 className="mb-2 text-base font-black text-heading dark:text-dark-text">
              {t(`home.features.${feature.key}.title`)}
            </h3>
            <p className="text-sm font-semibold text-muted dark:text-dark-muted">
              {t(`home.features.${feature.key}.desc`)}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeatureCards;
