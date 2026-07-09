import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { t } from '../../i18n/index.js';

// GAME-3 (Plotëso vendin bosh): the sentence has a blank; the learner taps a word from
// the bank to fill it (typed input is banned — the ë/ç problem). Tap again to remove,
// Confirm to submit. The chosen bank INDEX is reported to the engine; the server grades
// it and the teaching pair shows on the results review. No immediate correctness here
// (answers stay server-side) — matches the translate/match server flow.
const FillBlank = ({ question, answered, onAnswer, onNext, isLast }) => {
  const { before, after, bank } = question.prompt;
  const [selected, setSelected] = useState(null); // bank index or null

  const pick = (i) => {
    if (answered) return;
    setSelected((prev) => (prev === i ? null : i)); // tap again to remove
  };

  const confirm = () => {
    if (answered || selected === null) return;
    onAnswer(selected);
  };

  return (
    <>
      <div className="card mb-6">
        <p className="text-sm font-semibold text-muted dark:text-dark-muted mb-3">
          {t('quiz.fill.instruction')}
        </p>
        <p className="text-2xl font-black text-heading dark:text-dark-text leading-relaxed">
          {before}
          <span
            className={`inline-flex items-center justify-center min-w-[6rem] px-3 py-1 mx-1 rounded-lg align-middle border-2 border-dashed ${
              selected !== null
                ? 'border-fjalingo-green bg-fjalingo-green/10 border-solid'
                : 'border-border dark:border-dark-border'
            }`}
          >
            {selected !== null ? bank[selected] : '     '}
          </span>
          {after}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {bank.map((word, i) => (
          <button
            key={word}
            onClick={() => pick(i)}
            disabled={answered}
            className={`card text-center ${
              selected === i
                ? 'border-fjalingo-green bg-fjalingo-green/10 cursor-default'
                : 'card-hover cursor-pointer'
            } ${answered ? 'cursor-default' : ''}`}
          >
            <span className="font-bold text-heading dark:text-dark-text">{word}</span>
          </button>
        ))}
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

export default FillBlank;
