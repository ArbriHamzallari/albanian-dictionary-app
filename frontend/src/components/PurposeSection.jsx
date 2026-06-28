import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { t } from '../i18n/index.js';

// Plain-language wedge bullets: why Fjalingo exists, Albanian-first.
const BULLETS = ['real', 'play', 'free'];

const PurposeSection = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-fjalingo-green/5 via-transparent to-fjalingo-blue/5 dark:from-fjalingo-green/3 dark:to-fjalingo-blue/3 pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-6 py-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center text-3xl font-black text-heading dark:text-dark-text md:text-4xl"
        >
          {t('purpose.heading')}
        </motion.h2>

        <ul className="mx-auto flex max-w-xl flex-col gap-4">
          {BULLETS.map((key, i) => (
            <motion.li
              key={key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="card flex items-start gap-3"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fjalingo-green/15 text-fjalingo-green">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="font-semibold leading-relaxed text-body dark:text-dark-muted">
                {t(`purpose.bullets.${key}`)}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default PurposeSection;
