import { motion, useReducedMotion } from 'framer-motion';
import WordSwap from './manifesto/WordSwap.jsx';
import { t } from '../../i18n/index.js';

// Section 2 — the signature Manifesto (m4-rebrand.md §1, §4, §5.2). The approved
// brand sentence reveals word by word (once, on scroll into view), then the
// living loan→Albanian demonstration line plays beneath it. Paper surface, and
// nothing else in the section — the sentence IS the focal point.

const LINE_BREAK = Symbol('break');

// One-off staggered reveal — ~80ms per word (spec §4). This is a bespoke motif,
// not the shared SectionShell scroll-reveal (§3.8 names the manifesto as its own
// moment); RB-12 preserves it.
const sentence = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const word = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const PAIR_KEYS = [1, 2, 3, 4];

const Manifesto = ({ id, forceReducedMotion = false }) => {
  const reduceMotion = useReducedMotion() || forceReducedMotion;

  const line1 = t('landing.manifesto.line1');
  const line2 = t('landing.manifesto.line2');
  const tokens = [...line1.split(' '), LINE_BREAK, ...line2.split(' ')];

  const pairs = PAIR_KEYS.map((n) => ({
    loan: t(`TODO_SQ_landing_manifesto_pair${n}_loan`),
    albanian: t(`TODO_SQ_landing_manifesto_pair${n}_albanian`),
  }));

  return (
    <section id={id} className="bg-paper">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 md:py-20 lg:py-[120px]">
        <motion.p
          className="flex flex-wrap justify-center gap-x-[0.28em] gap-y-1 text-balance text-3xl font-black leading-tight text-ink sm:text-4xl md:text-5xl"
          variants={reduceMotion ? undefined : sentence}
          initial={reduceMotion ? false : 'hidden'}
          whileInView={reduceMotion ? undefined : 'visible'}
          viewport={{ once: true, amount: 0.5 }}
        >
          {tokens.map((tok, idx) =>
            tok === LINE_BREAK ? (
              <span key="break" className="basis-full" aria-hidden="true" />
            ) : (
              <motion.span
                key={idx}
                variants={reduceMotion ? undefined : word}
                className="inline-block"
              >
                {tok}
              </motion.span>
            ),
          )}
        </motion.p>

        <div className="mt-10 sm:mt-12">
          <WordSwap pairs={pairs} forceReducedMotion={reduceMotion} />
        </div>
      </div>
    </section>
  );
};

export default Manifesto;
