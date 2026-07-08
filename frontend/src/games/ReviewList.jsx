import { Link } from 'react-router-dom';
import { Check, X, ArrowRight } from 'lucide-react';
import { t } from '../i18n/index.js';

// GAME-1 teaching moment: the per-question review shown on the results screen. Each
// item teaches — the correct Albanian word, the definition, and the example pair
// (loan vs clean, contrasted exactly like WordDetail) with a "Mëso më shumë" link to
// the word page. Data comes from the /quiz submit response (server-side only); guest
// quizzes send no review, so this renders nothing for them.
const ReviewList = ({ review }) => {
  if (!review?.length) return null;

  return (
    <div className="text-left mb-8">
      <h3 className="text-sm font-black text-fjalingo-blue tracking-wide mb-4 text-center">
        {t('quiz.review.heading')}
      </h3>
      <div className="space-y-4">
        {review.map((r) => (
          <div key={r.idx} className="card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-lg font-black text-heading dark:text-dark-text">"{r.borrowed_word}"</p>
              <span
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  r.correct ? 'bg-fjalingo-green/15' : 'bg-accent-coral/15'
                }`}
              >
                {r.correct ? (
                  <Check className="w-4 h-4 text-fjalingo-green" />
                ) : (
                  <X className="w-4 h-4 text-fjalingo-red" />
                )}
              </span>
            </div>

            <div className="space-y-1 mb-3">
              {!r.correct && (
                <p className="text-sm font-semibold text-muted dark:text-dark-muted">
                  {t('quiz.review.yourAnswer')}{' '}
                  <span className="text-fjalingo-red font-bold line-through">{r.your_answer}</span>
                </p>
              )}
              <p className="text-sm font-semibold text-muted dark:text-dark-muted">
                {t('quiz.review.correctAnswer')}{' '}
                <span className="text-fjalingo-green font-bold">{r.correct_answer}</span>
              </p>
            </div>

            {r.definition_sq && (
              <p className="text-sm font-semibold text-body dark:text-dark-text leading-relaxed mb-3">
                {r.definition_sq}
              </p>
            )}

            {r.example && (
              <div className="space-y-2 mb-3">
                <p className="rounded-xl bg-accent-coral/10 border border-accent-coral/20 px-4 py-2.5 text-sm font-semibold text-body dark:text-dark-text line-through decoration-accent-coral/60">
                  {r.example.loan}
                </p>
                <p className="rounded-xl bg-fjalingo-green/10 border border-fjalingo-green/20 px-4 py-2.5 text-sm font-semibold text-body dark:text-dark-text">
                  {r.example.clean}
                </p>
              </div>
            )}

            {r.slug && (
              <Link
                to={`/fjala/${r.slug}`}
                className="inline-flex items-center gap-1 text-fjalingo-purple font-bold text-sm hover:gap-2 transition-all"
              >
                {t('quiz.review.learnMore')} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewList;
