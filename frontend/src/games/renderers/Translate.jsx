import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { t } from '../../i18n/index.js';

// Presentational renderer for a single `translate` question (GAME-1 shape: pick the
// correct Albanian for a borrowed word). All game state lives in GameEngine — this
// only renders the current question and reports the tapped option + advance.
//
// `serverGraded` sessions (logged-in) don't learn correctness until the batch is
// submitted, so they show a neutral "answer saved" state; guest sessions are graded
// locally and can show correct/incorrect immediately. GAME-1 adds the teaching moment.
const Translate = ({ question, status, selected, serverGraded, onAnswer, onNext, isLast }) => {
  const correctAnswer = question.correct_answer; // guest-only; undefined for server sessions
  const isCorrectAnswer = (opt) => opt === correctAnswer;

  return (
    <>
      <div className="card mb-6">
        <p className="text-sm font-semibold text-muted dark:text-dark-muted mb-2">
          {t('quiz.questionPrompt')}
        </p>
        <h3 className="text-3xl font-black text-heading dark:text-dark-text">
          "{question.prompt.borrowed_word}"
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((option, i) => {
          const letter = ['A', 'B', 'C', 'D'][i];
          let optClass = 'card card-hover cursor-pointer';

          if (status === 'answered') {
            if (serverGraded) {
              optClass = selected === option
                ? 'card border-fjalingo-blue bg-fjalingo-blue/10 cursor-default'
                : 'card opacity-50 cursor-default';
            } else if (isCorrectAnswer(option)) {
              optClass = 'card border-fjalingo-green bg-fjalingo-green/10 cursor-default';
            } else if (selected === option) {
              optClass = 'card border-fjalingo-red bg-fjalingo-red/10 cursor-default animate-shake';
            } else {
              optClass = 'card opacity-50 cursor-default';
            }
          }

          return (
            <button
              key={option}
              onClick={() => onAnswer(option)}
              disabled={status === 'answered'}
              className={`${optClass} text-left flex items-center gap-3`}
            >
              <span className="w-8 h-8 rounded-lg bg-border dark:bg-dark-border flex items-center justify-center text-sm font-black text-heading dark:text-dark-text flex-shrink-0">
                {letter}
              </span>
              <span className="font-bold text-heading dark:text-dark-text">{option}</span>
            </button>
          );
        })}
      </div>

      {status === 'answered' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          {serverGraded ? (
            <p className="text-lg font-black text-heading dark:text-dark-text mb-3">
              {t('quiz.answerSaved')}
            </p>
          ) : isCorrectAnswer(selected) ? (
            <p className="text-lg font-black text-fjalingo-green mb-3">
              {t('quiz.correctFeedback')}
            </p>
          ) : (
            <p className="text-lg font-black text-fjalingo-red mb-3">
              {t('quiz.wrongFeedback')} <span className="text-fjalingo-green">{correctAnswer}</span>
            </p>
          )}
          <button onClick={onNext} className="btn-primary inline-flex items-center gap-2">
            {isLast ? t('quiz.seeResult') : t('quiz.continue')} <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </>
  );
};

export default Translate;
