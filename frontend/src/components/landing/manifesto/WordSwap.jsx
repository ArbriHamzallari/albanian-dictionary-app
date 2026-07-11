import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// The living demonstration line (m4-rebrand.md §4): a loanword rendered in
// accent-coral dissolves (opacity + blur), and its Albanian equivalent settles
// into place in brand-green with a soft spring — cycling gently through the
// pairs. Reduced motion → a static typographic lockup, no animation.

const SPRING = { type: 'spring', stiffness: 260, damping: 20 };
// Gentle holds so the loop reads calm, never distracting (spec §4, constraints).
const HOLD = { loan: 1500, albanian: 1900 };

const WordSwap = ({ pairs, forceReducedMotion = false }) => {
  const reduceMotion = useReducedMotion() || forceReducedMotion;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('loan');

  useEffect(() => {
    if (reduceMotion || pairs.length === 0) return undefined;
    const id = setTimeout(() => {
      if (phase === 'loan') {
        setPhase('albanian');
      } else {
        setPhase('loan');
        setIndex((prev) => (prev + 1) % pairs.length);
      }
    }, HOLD[phase]);
    return () => clearTimeout(id);
  }, [phase, index, reduceMotion, pairs.length]);

  if (pairs.length === 0) return null;

  if (reduceMotion) {
    return (
      <div className="flex flex-col items-center gap-2">
        {pairs.map(({ loan, albanian }, i) => (
          <p key={i} className="text-xl font-black sm:text-2xl">
            <span className="text-accent-coral line-through decoration-2">{loan}</span>{' '}
            <span className="text-brand-green">{albanian}</span>
          </p>
        ))}
      </div>
    );
  }

  const pair = pairs[index];
  const isLoan = phase === 'loan';

  return (
    <>
      {/* Screen readers always get the pairs, even while the visual cycles. */}
      <span className="sr-only">
        {pairs.map((p) => `${p.loan} → ${p.albanian}`).join(', ')}
      </span>
      <div
        aria-hidden="true"
        className="flex min-h-[3rem] items-center justify-center text-3xl font-black sm:min-h-[3.5rem] sm:text-4xl"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={`${index}-${phase}`}
            className={isLoan ? 'text-accent-coral' : 'text-brand-green'}
            initial={{ opacity: 0, filter: 'blur(6px)', y: 8 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0, transition: SPRING }}
            exit={{ opacity: 0, filter: 'blur(6px)', y: -6, transition: { duration: 0.35 } }}
          >
            {isLoan ? pair.loan : pair.albanian}
          </motion.span>
        </AnimatePresence>
      </div>
    </>
  );
};

export default WordSwap;
