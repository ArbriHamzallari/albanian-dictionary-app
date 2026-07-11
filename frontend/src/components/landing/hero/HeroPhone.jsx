import { motion, useReducedMotion } from 'framer-motion';
import PhoneFrame from '../../ui/PhoneFrame.jsx';
import Parrot from '../../mascot/Parrot.jsx';
import { t } from '../../../i18n/index.js';

// The hero's right side (m4-rebrand.md §5.1): a PhoneFrame holding a small STATIC
// replica of the quiz screen (no screenshot), composed from token pieces, with a
// floating parrot. The loan/authentic colour rule (§2) drives the mock: the
// loanword is coral, the correct Albanian option is green.
const HeroPhone = () => {
  const reduceMotion = useReducedMotion();

  const options = [
    { key: 'answer', text: t('TODO_SQ_landing_hero_demo_answer'), correct: true },
    { key: 'option2', text: t('TODO_SQ_landing_hero_demo_option2') },
    { key: 'option3', text: t('TODO_SQ_landing_hero_demo_option3') },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <PhoneFrame>
        <div className="space-y-4 bg-paper p-4">
          <div className="h-2 w-full overflow-hidden rounded-pill bg-line">
            <div className="h-full w-2/3 rounded-pill bg-brand-green" />
          </div>

          <p className="text-center text-sm font-bold text-ink-soft">
            {t('TODO_SQ_landing_hero_demo_prompt')}
          </p>
          <p className="text-center text-2xl font-black text-accent-coral">
            {t('TODO_SQ_landing_hero_demo_loanword')}
          </p>

          <div className="grid gap-2">
            {options.map(({ key, text, correct }) => (
              <div
                key={key}
                className={[
                  'rounded-xl border-2 px-3 py-2.5 text-center text-sm font-bold',
                  correct
                    ? 'border-brand-green bg-brand-green/10 text-brand-green'
                    : 'border-line text-ink-soft',
                ].join(' ')}
              >
                {text}
              </div>
            ))}
          </div>
        </div>
      </PhoneFrame>

      <motion.div
        className="absolute -bottom-4 -left-6 sm:-left-10"
        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Parrot state="wave" size={116} label="Papagalli Fjalingo" />
      </motion.div>
    </div>
  );
};

export default HeroPhone;
