import { motion } from 'framer-motion';
import { t } from '../../i18n/index.js';

const numberFormat = new Intl.NumberFormat('sq-AL');

// Section 2 (M4 decode): the social-proof strip, adapted HONESTLY — no fake numbers.
// Live word count from the public stats endpoint; the rest are true product facts
// (five origin worlds, zero ads, zero hearts). `words` is null until stats load, so
// only that tile shows a skeleton — the layout never shifts.
const ProofStrip = ({ words }) => {
  const items = [
    { key: 'words', value: words, label: t('home.proof.wordsLabel') },
    { key: 'worlds', value: 5, label: t('home.proof.worldsLabel') },
    { key: 'ads', value: 0, label: t('home.proof.adsLabel') },
    { key: 'hearts', value: 0, label: t('TODO_SQ_proof_hearts') },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {items.map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className="card py-5 text-center sm:py-6"
          >
            {item.value === null ? (
              <span className="mx-auto block h-7 w-14 animate-pulse rounded bg-line dark:bg-dark-border sm:h-9" />
            ) : (
              <p className="text-2xl font-black text-heading dark:text-dark-text sm:text-3xl md:text-4xl">
                {numberFormat.format(item.value)}
              </p>
            )}
            <p className="mt-1 text-xs font-bold text-muted dark:text-dark-muted sm:text-sm">
              {item.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ProofStrip;
