import { motion } from 'framer-motion';
import { Ban, Heart, ShieldCheck, MessageSquare, Server, CalendarClock } from 'lucide-react';
import { t } from '../../i18n/index.js';

// Section 7 (M4 decode): the trust block — six real guarantees Fjalingo can stand
// behind (no fluff): no ads, no hearts/pressure, child safety by design, protected
// messages, server-saved progress, cancel anytime.
const GUARANTEES = [
  { key: 'ads', icon: Ban, tint: 'text-accent-coral', bg: 'bg-accent-coral/10' },
  { key: 'hearts', icon: Heart, tint: 'text-brand-green', bg: 'bg-brand-green/10' },
  { key: 'safety', icon: ShieldCheck, tint: 'text-accent-purple', bg: 'bg-accent-purple/10' },
  { key: 'messages', icon: MessageSquare, tint: 'text-brand-green', bg: 'bg-brand-green/10' },
  { key: 'server', icon: Server, tint: 'text-accent-yellow', bg: 'bg-accent-yellow/10' },
  { key: 'cancel', icon: CalendarClock, tint: 'text-accent-purple', bg: 'bg-accent-purple/10' },
];

const TrustCards = () => (
  <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
    <div className="mb-10 text-center">
      <p className="text-xs font-black uppercase tracking-widest text-brand-green">
        {t('home.trust.eyebrow')}
      </p>
      <h2 className="mt-2 text-2xl font-black text-heading dark:text-dark-text sm:text-3xl">
        {t('home.trust.heading')}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-semibold text-muted dark:text-dark-muted sm:text-base">
        {t('home.trust.lead')}
      </p>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {GUARANTEES.map((item, i) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: (i % 3) * 0.08 }}
          className="card flex items-start gap-4"
        >
          <span
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${item.bg}`}
          >
            <item.icon className={`h-5 w-5 ${item.tint}`} aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-black text-heading dark:text-dark-text">
              {t(`home.trust.${item.key}.title`)}
            </h3>
            <p className="mt-1 text-sm font-semibold text-muted dark:text-dark-muted">
              {t(`home.trust.${item.key}.desc`)}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

export default TrustCards;
