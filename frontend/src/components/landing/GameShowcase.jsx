import { motion } from 'framer-motion';
import { t } from '../../i18n/index.js';

// A static, non-interactive mock of the signature "Gjej fjalën e huazuar" game. The
// chips are loanwords (foreign words, not Albanian UI copy), one shown as the tapped
// answer — purely illustrative. No data fetch, so the section never shifts. The real
// playable question lives in the demo section below.
const MOCK_CHIPS = [
  { word: 'email', selected: true },
  { word: 'meeting', selected: false },
  { word: 'deadline', selected: false },
  { word: 'weekend', selected: false },
];

const BULLETS = ['level', 'types', 'win'];

const PhoneMock = () => (
  <div className="mx-auto w-full max-w-[280px]">
    <div className="rounded-[2.25rem] border-[6px] border-ink bg-paper p-3 shadow-card dark:border-dark-border">
      <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-line dark:bg-dark-border" />
      <div className="card">
        <p className="mb-4 text-xs font-bold text-muted dark:text-dark-muted">
          {t('quiz.spot.instruction')}
        </p>
        <div className="flex flex-wrap gap-2">
          {MOCK_CHIPS.map((chip) => (
            <span
              key={chip.word}
              className={`rounded-xl border-2 px-3 py-2 text-sm font-bold ${
                chip.selected
                  ? 'border-brand-green bg-brand-green/10 text-brand-green'
                  : 'border-border text-heading dark:border-dark-border dark:text-dark-text'
              }`}
            >
              {chip.word}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const GameShowcase = () => (
  <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
    <div className="grid items-center gap-10 md:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <PhoneMock />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-black text-heading dark:text-dark-text sm:text-3xl">
          {t('home.showcase.heading')}
        </h2>
        <ol className="mt-6 space-y-5">
          {BULLETS.map((key, i) => (
            <li key={key} className="flex gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-sm font-black text-brand-green">
                {i + 1}
              </span>
              <div>
                <p className="font-black text-heading dark:text-dark-text">
                  {t(`home.showcase.${key}.title`)}
                </p>
                <p className="mt-1 text-sm font-semibold text-muted dark:text-dark-muted">
                  {t(`home.showcase.${key}.desc`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </motion.div>
    </div>
  </section>
);

export default GameShowcase;
