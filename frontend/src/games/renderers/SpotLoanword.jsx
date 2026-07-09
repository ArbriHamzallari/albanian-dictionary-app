import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { t } from '../../i18n/index.js';

// GAME-4 (Gjej fjalën e huazuar) — the signature mechanic: the loan sentence is shown
// as tappable word chips; the learner taps the foreign word and confirms. The tapped
// token INDEX is reported to the engine; the server holds the correct index (never
// sent) and grades it. Teaching (loan vs clean, link) shows on the results review —
// consistent with the other games (answers stay server-side, so no inline correctness).
const SpotLoanword = ({ question, answered, onAnswer, onNext, isLast }) => {
  const { tokens } = question.prompt;
  const [selected, setSelected] = useState(null); // token index or null

  const tap = (i) => {
    if (answered) return;
    setSelected((prev) => (prev === i ? null : i)); // tap again to deselect
  };

  const confirm = () => {
    if (answered || selected === null) return;
    onAnswer(selected);
  };

  return (
    <>
      <div className="card mb-6">
        <p className="text-sm font-semibold text-muted dark:text-dark-muted mb-4">
          {t('quiz.spot.instruction')}
        </p>
        <div className="flex flex-wrap gap-2">
          {tokens.map((token, i) => (
            <button
              key={`${i}-${token}`}
              onClick={() => tap(i)}
              disabled={answered}
              className={`px-3 py-2 rounded-xl border-2 text-lg font-bold text-heading dark:text-dark-text transition-colors ${
                selected === i
                  ? 'border-fjalingo-blue bg-fjalingo-blue/10'
                  : 'border-border dark:border-dark-border hover:border-fjalingo-blue/50'
              } ${answered ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {token}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        {!answered ? (
          <button onClick={confirm} disabled={selected === null} className="btn-primary inline-flex items-center gap-2">
            {t('quiz.fill.confirm')}
          </button>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={onNext} className="btn-primary inline-flex items-center gap-2">
              {isLast ? t('quiz.seeResult') : t('quiz.continue')} <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </>
  );
};

export default SpotLoanword;
