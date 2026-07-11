import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import SectionShell from '../ui/SectionShell.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import SectionTitle from '../ui/SectionTitle.jsx';
import Button from '../ui/Button.jsx';
import Parrot from '../mascot/Parrot.jsx';
import { t } from '../../i18n/index.js';
import api from '../../utils/api.js';

// Section 5 — the interactive demo (m4-rebrand.md §5.5). ONE real, server-graded
// question. The API contract is UNTOUCHED: GET /public/demo-question -> { id, tokens };
// POST /public/demo-answer { id, selected } -> { correct, answer, teach }. Only the
// PRESENTATION is elevated: the quiz card is the spotlight on --surface-cream, the
// parrot reacts (think -> cheer), one confetti burst fires per correct answer, and a
// wrong answer gets a warm retry (coral, never red). All motion is reduced-motion safe.

// canvas-confetti needs literal colours (it can't read CSS vars) — matches Parrot.jsx.
const CONFETTI_COLORS = ['#2BB673', '#FFC93C', '#FF7A6B', '#8B7FF5'];

const DemoSkeleton = () => (
  // Fixed dimensions mirror the loaded layout so nothing shifts (spec §5.5, no CLS).
  <div>
    <div className="mx-auto mb-4 h-4 w-40 animate-pulse rounded bg-line" />
    <div className="flex flex-wrap justify-center gap-2">
      {[64, 88, 72, 56, 80].map((w, i) => (
        <span key={i} className="h-11 animate-pulse rounded-xl bg-line" style={{ width: w }} />
      ))}
    </div>
    <div className="mt-8 flex justify-center">
      <div className="h-14 w-40 animate-pulse rounded-2xl bg-line" />
    </div>
  </div>
);

const DemoResult = ({ result }) => (
  <div className="mx-auto max-w-md">
    <div
      className={`flex items-center justify-center gap-2 text-lg font-black ${
        result.correct ? 'text-brand-green-dark' : 'text-accent-coral'
      }`}
    >
      {result.correct ? (
        <>
          <Check className="h-5 w-5" aria-hidden="true" /> {t('home.demo.correct')}
        </>
      ) : (
        t('home.demo.wrong')
      )}
    </div>
    {!result.correct && (
      <p className="mt-2 text-center text-sm font-semibold text-ink-soft">
        {t('TODO_SQ_landing_demo_warm')}
      </p>
    )}
    <p className="mt-3 text-center font-bold text-ink-soft">
      {t('home.demo.answerLabel')}{' '}
      <span className="text-ink">
        {result.teach.borrowed_word} → {result.teach.correct_albanian}
      </span>
    </p>
  </div>
);

const DemoQuestion = () => {
  const reduceMotion = useReducedMotion();
  const [question, setQuestion] = useState(null); // { id, tokens }
  const [selected, setSelected] = useState(null); // token index
  const [result, setResult] = useState(null); // { correct, answer, teach }
  const [status, setStatus] = useState('loading'); // loading | ready | submitting | error

  // ── API logic (UNTOUCHED from the shipped version) ──────────────────────────
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
  // ────────────────────────────────────────────────────────────────────────────

  // One confetti burst per correct answer (fires once — result is a fresh object
  // per submit), reduced-motion safe.
  useEffect(() => {
    if (!result?.correct || reduceMotion) return;
    confetti({
      particleCount: 70,
      spread: 72,
      origin: { y: 0.6 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
  }, [result, reduceMotion]);

  const parrotState = result?.correct ? 'cheer' : result ? 'idle' : 'think';

  const tokenClass = (i) => {
    if (result) {
      if (i === result.answer) return 'border-brand-green bg-brand-green/15 text-brand-green-dark';
      if (i === selected) return 'border-accent-coral bg-accent-coral/10 text-accent-coral';
      return 'border-line bg-paper text-ink-soft';
    }
    return selected === i
      ? 'border-brand-green bg-brand-green/10 text-brand-green-dark'
      : 'border-line bg-paper text-ink hover:border-brand-green/50';
  };

  return (
    <SectionShell surface="cream" id="demo" className="scroll-mt-20">
      <div className="flex flex-col items-center text-center">
        <Eyebrow>{t('home.demo.eyebrow')}</Eyebrow>
        <SectionTitle
          className="mt-4"
          align="center"
          title={t('TODO_SQ_landing_demo_title')}
          accentWord={t('TODO_SQ_landing_demo_title_accent')}
          accent="green"
        />
      </div>

      <div className="relative mx-auto mt-14 max-w-xl">
        <div className="pointer-events-none absolute -top-12 right-0 z-10">
          <Parrot state={parrotState} size={96} />
        </div>

        <div className="relative rounded-3xl border border-line bg-paper p-6 shadow-card-hover sm:p-8">
          {status === 'error' ? (
            <div className="text-center">
              <p className="font-bold text-ink">{t('home.demo.loadError')}</p>
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" onClick={loadQuestion}>
                  {t('home.demo.retry')}
                </Button>
              </div>
            </div>
          ) : status === 'loading' || !question ? (
            <DemoSkeleton />
          ) : (
            <>
              <p className="mb-4 text-center text-sm font-bold text-ink-soft">
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

              <AnimatePresence mode="wait">
                {!result ? (
                  <motion.div
                    key="confirm"
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    className="mt-8 flex justify-center"
                  >
                    <Button onClick={submit} disabled={selected === null || status === 'submitting'}>
                      {t('quiz.fill.confirm')}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8"
                  >
                    <DemoResult result={result} />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {result && (
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/kuizi">
              <Button size="lg">
                {t('home.demo.cta')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <button
              onClick={loadQuestion}
              className="font-bold text-ink-soft underline-offset-4 hover:underline"
            >
              {t('home.demo.another')}
            </button>
          </div>
        )}
      </div>
    </SectionShell>
  );
};

export default DemoQuestion;
