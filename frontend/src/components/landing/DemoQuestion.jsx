import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';
import { t } from '../../i18n/index.js';
import api from '../../utils/api.js';

// Section 6 (M4 decode): ONE real "Gjej fjalën e huazuar" question, playable without
// signup. The question (tokens only) comes from GET /public/demo-question; the tapped
// token index is graded by POST /public/demo-answer — the answer index and the teaching
// stay server-side until the player commits. Brand-green panel (not the reference blue);
// the interactive chips and feedback sit on white surfaces so text holds AA on green.
const DemoQuestion = () => {
  const [question, setQuestion] = useState(null); // { id, tokens }
  const [selected, setSelected] = useState(null); // token index
  const [result, setResult] = useState(null); // { correct, answer, teach }
  const [status, setStatus] = useState('loading'); // loading | ready | submitting | error

  const loadQuestion = useCallback(async () => {
    setStatus('loading');
    setSelected(null);
    setResult(null);
    try {
      const res = await api.get('/public/demo-question');
      setQuestion(res.data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  const submit = async () => {
    if (selected === null || status === 'submitting') return;
    setStatus('submitting');
    try {
      const res = await api.post('/public/demo-answer', { id: question.id, selected });
      setResult(res.data);
      setStatus('ready');
    } catch (err) {
      // 410 = the cached question rotated out; reload a fresh one.
      if (err?.response?.status === 410) {
        loadQuestion();
        return;
      }
      setStatus('error');
    }
  };

  // Token chips live on a white surface (dark text) so contrast holds on the green panel.
  const tokenClass = (i) => {
    if (result) {
      if (i === result.answer) return 'border-brand-green bg-brand-green/15 text-brand-green-dark';
      if (i === selected) return 'border-accent-coral bg-accent-coral/10 text-accent-coral';
      return 'border-line bg-paper text-muted dark:border-dark-border dark:text-dark-muted';
    }
    return selected === i
      ? 'border-brand-green bg-brand-green/10 text-brand-green-dark'
      : 'border-line bg-paper text-heading hover:border-brand-green/50 dark:border-dark-border dark:text-dark-text';
  };

  const whiteButton =
    'inline-flex items-center gap-2 rounded-xl bg-paper px-8 py-3 font-black text-brand-green-dark shadow-[0_3px_0_0_rgba(0,0,0,0.18)] transition-all active:translate-y-0.5 active:shadow-none';

  return (
    <section id="demo" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-14 sm:px-6">
      <div className="rounded-3xl bg-brand-green px-5 py-10 text-center shadow-card sm:px-10 sm:py-12">
        <span className="inline-block rounded-pill bg-paper px-4 py-1 text-xs font-black uppercase tracking-widest text-brand-green-dark">
          {t('home.demo.eyebrow')}
        </span>
        <h2 className="mx-auto mt-4 max-w-xl text-2xl font-black text-white sm:text-3xl">
          {t('home.demo.heading')}
        </h2>

        {status === 'error' ? (
          <div className="mx-auto mt-8 max-w-md rounded-2xl bg-paper p-6">
            <p className="font-bold text-heading dark:text-dark-text">{t('home.demo.loadError')}</p>
            <button onClick={loadQuestion} className={`${whiteButton} mt-4 border-2 border-line`}>
              {t('home.demo.retry')}
            </button>
          </div>
        ) : status === 'loading' || !question ? (
          <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-2">
            {[64, 88, 72, 56, 80].map((w, i) => (
              <span
                key={i}
                className="h-11 animate-pulse rounded-xl bg-white/25"
                style={{ width: w }}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-paper p-5 sm:p-6">
              <p className="mb-4 text-sm font-bold text-muted dark:text-dark-muted">
                {t('quiz.spot.instruction')}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {question.tokens.map((token, i) => (
                  <button
                    key={`${i}-${token}`}
                    onClick={() => !result && setSelected((prev) => (prev === i ? null : i))}
                    disabled={!!result}
                    className={`rounded-xl border-2 px-3 py-2 text-base font-bold transition-colors ${tokenClass(
                      i,
                    )} ${result ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div key="confirm" exit={{ opacity: 0 }} className="mt-8">
                  <button
                    onClick={submit}
                    disabled={selected === null || status === 'submitting'}
                    className={`${whiteButton} disabled:opacity-50 disabled:shadow-none`}
                  >
                    {t('quiz.fill.confirm')}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <div className="mx-auto max-w-md rounded-2xl bg-paper p-5 sm:p-6">
                    <div
                      className={`flex items-center justify-center gap-2 text-lg font-black ${
                        result.correct ? 'text-brand-green-dark' : 'text-accent-coral'
                      }`}
                    >
                      {result.correct ? (
                        <>
                          <Check className="h-5 w-5" /> {t('home.demo.correct')}
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5" /> {t('home.demo.wrong')}
                        </>
                      )}
                    </div>
                    <p className="mt-3 font-bold text-muted dark:text-dark-muted">
                      {t('home.demo.answerLabel')}{' '}
                      <span className="text-heading dark:text-dark-text">
                        {result.teach.borrowed_word} → {result.teach.correct_albanian}
                      </span>
                    </p>
                  </div>
                  <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link to="/kuizi" className={whiteButton}>
                      {t('home.demo.cta')} <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={loadQuestion}
                      className="font-bold text-white underline-offset-4 hover:underline"
                    >
                      {t('home.demo.another')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  );
};

export default DemoQuestion;
