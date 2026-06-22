import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import api from '../utils/api.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Heading from '../components/ui/Heading.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const SPRING = { type: 'spring', stiffness: 300, damping: 22 };

// Normalize like the server so the loanword token highlights correctly.
const norm = (s) => String(s || '').normalize('NFC').toLowerCase().trim();
const stripEdges = (s) => String(s).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

// ── Top progress bar ─────────────────────────────────────────
const ProgressBar = ({ value }) => (
  <div className="h-3 w-full rounded-pill bg-line overflow-hidden">
    <motion.div
      className="h-full rounded-pill bg-brand-green"
      initial={false}
      animate={{ width: `${value}%` }}
      transition={SPRING}
    />
  </div>
);

// ── "Pse ka rëndësi" reveal card ─────────────────────────────
const WhyCard = ({ text }) => {
  if (!text) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
    >
      <Card padding="md" className="border-accent-yellow bg-accent-yellow/10">
        <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft mb-1">
          Pse ka rëndësi
        </p>
        <p className="text-base font-semibold text-ink">{text}</p>
      </Card>
    </motion.div>
  );
};

// ── spot_alblish: tap the borrowed word ──────────────────────
const SpotAlblish = ({ exercise, reveal, selectedIndex, onSelect }) => {
  const reduceMotion = useReducedMotion();
  const tokens = exercise.prompt.sentence.split(/\s+/).filter(Boolean);
  const loanword = reveal ? norm(reveal.answer.loanword) : null;

  return (
    <div className="space-y-6">
      <p className="text-sm font-bold text-ink-soft">Gjej fjalën e huazuar dhe trokit mbi të.</p>

      <div className="flex flex-wrap gap-x-2 gap-y-3 text-2xl md:text-3xl font-extrabold leading-relaxed">
        {tokens.map((token, i) => {
          const isLoan = loanword && norm(token).includes(loanword);
          const isPicked = selectedIndex === i;

          let cls = 'px-2 py-1 rounded-xl transition-colors';
          if (!reveal) {
            cls += isPicked
              ? ' bg-brand-green/15 text-ink ring-2 ring-brand-green'
              : ' text-ink hover:bg-cloud cursor-pointer';
          } else if (isLoan) {
            cls += ' bg-brand-green text-paper';
          } else if (isPicked) {
            cls += ' bg-accent-coral text-paper';
          } else {
            cls += ' text-ink-soft';
          }

          const shouldShake = reveal && isPicked && !reveal.correct && !reduceMotion;

          return (
            <motion.button
              key={`${token}-${i}`}
              type="button"
              disabled={Boolean(reveal)}
              onClick={() => onSelect(stripEdges(token), i)}
              whileTap={reveal || reduceMotion ? undefined : { scale: 0.92 }}
              className={cls + (shouldShake ? ' animate-shake' : '')}
            >
              {token}
            </motion.button>
          );
        })}
      </div>

      {reveal && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="space-y-4"
        >
          <Card padding="md" className="border-brand-green bg-brand-green/5">
            <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft mb-1">
              Shqip
            </p>
            <p className="text-xl font-extrabold text-ink">{reveal.answer.corrected_sentence}</p>
          </Card>
          <WhyCard text={reveal.why_it_matters} />
        </motion.div>
      )}
    </div>
  );
};

// ── translation / fill_blank: pick the correct word ──────────
const ChoiceExercise = ({ exercise, reveal, selectedValue, onSelect }) => {
  const isFill = exercise.type === 'fill_blank';
  const { loanword, sentence, options } = exercise.prompt;

  const renderFillSentence = () => {
    const parts = (sentence || '').split('{{blank}}');
    const gapText = reveal ? selectedValue : '_____';
    const gapCls = reveal
      ? reveal.correct
        ? 'text-brand-green'
        : 'text-accent-coral line-through'
      : 'text-ink-soft';
    return (
      <span>
        {parts[0]}
        <span className={`font-black ${gapCls}`}>{gapText}</span>
        {parts[1]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {isFill ? (
        <>
          <p className="text-sm font-bold text-ink-soft">Plotëso vendin bosh.</p>
          <p className="text-2xl md:text-3xl font-extrabold text-ink leading-relaxed">
            {renderFillSentence()}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-ink-soft">Zgjidh fjalën e saktë në shqip.</p>
          {sentence ? (
            <p className="text-xl font-semibold text-ink">{sentence}</p>
          ) : null}
          <p className="text-3xl md:text-4xl font-black text-ink">"{loanword}"</p>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => {
          const isCorrectOption = reveal && norm(option) === norm(reveal.answer.correct);
          const isPicked = norm(option) === norm(selectedValue || '');

          let variant = 'secondary';
          let extra = '';
          if (reveal) {
            if (isCorrectOption) variant = 'primary';
            else if (isPicked) {
              variant = 'danger';
              extra = 'animate-shake';
            } else extra = 'opacity-50';
          }

          return (
            <Button
              key={option}
              variant={variant}
              size="lg"
              fullWidth
              disabled={Boolean(reveal)}
              onClick={() => onSelect(option)}
              className={extra}
            >
              {option}
            </Button>
          );
        })}
      </div>

      {reveal && <WhyCard text={reveal.why_it_matters} />}
    </div>
  );
};

// `taste` mode plays a single public Spot-the-Alblish exercise with no account
// and no persistence (used by onboarding). `onComplete` is called when the user
// finishes it. In taste mode the component renders embedded (no full-screen
// chrome) so it can sit inside the onboarding stepper card.
const Lesson = ({ taste = false, onComplete }) => {
  const { lessonId } = useParams();
  const isPractice = !taste && !lessonId;
  const navigate = useNavigate();
  const { loadUser } = useAuth();

  let submitPath;
  if (taste) submitPath = '/lessons/sample/grade';
  else if (isPractice) submitPath = '/lessons/practice/submit';
  else submitPath = `/lessons/${lessonId}/submit`;

  const [status, setStatus] = useState('loading'); // loading | error | playing | finished | empty
  const [errorInfo, setErrorInfo] = useState(null); // { message, code }
  const [meta, setMeta] = useState(null); // lesson meta (lesson mode)
  const [exercises, setExercises] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState({}); // id -> { value, index }
  const [reveals, setReveals] = useState({}); // id -> result
  const [checking, setChecking] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorInfo(null);
    setSelected({});
    setReveals({});
    setIndex(0);
    setFinalResult(null);
    try {
      if (taste) {
        const res = await api.get('/lessons/sample');
        setExercises(res.data.exercise ? [res.data.exercise] : []);
        setMeta({ title: 'Provo një shembull' });
      } else if (isPractice) {
        const res = await api.get('/lessons/practice-mistakes');
        const list = res.data.exercises || [];
        if (!list.length) {
          setStatus('empty');
          return;
        }
        setExercises(list);
        setMeta({ title: 'Përsërit gabimet' });
      } else {
        const res = await api.get(`/lessons/${lessonId}`);
        const list = res.data.exercises || [];
        if (!list.length) {
          setStatus('empty');
          return;
        }
        setExercises(list);
        setMeta(res.data.lesson);
      }
      setStatus('playing');
    } catch (err) {
      const data = err?.response?.data;
      setErrorInfo({
        message: data?.message || 'Mësimi nuk mund të ngarkohej. Provoni përsëri.',
        code: data?.code || null,
      });
      setStatus('error');
    }
  }, [taste, isPractice, lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  const current = exercises[index];
  const currentReveal = current ? reveals[current.id] : null;
  const isLast = index >= exercises.length - 1;

  const handleSelect = async (value, tokenIndex = null) => {
    if (!current || reveals[current.id] || checking) return;
    setSelected((prev) => ({ ...prev, [current.id]: { value, index: tokenIndex } }));
    setChecking(true);
    try {
      const res = await api.post(submitPath, {
        answers: [{ exercise_id: current.id, response: value }],
        check: true,
      });
      const result = res.data.results?.[0];
      if (result) {
        setReveals((prev) => ({ ...prev, [current.id]: result }));
      }
    } catch (err) {
      // On a check failure, let the user retry the tap.
      setSelected((prev) => {
        const next = { ...prev };
        delete next[current.id];
        return next;
      });
    } finally {
      setChecking(false);
    }
  };

  const finalize = async () => {
    try {
      const answers = exercises
        .filter((ex) => selected[ex.id])
        .map((ex) => ({ exercise_id: ex.id, response: selected[ex.id].value }));
      const res = await api.post(submitPath, { answers, check: false });
      setFinalResult(res.data);
      setStatus('finished');
      loadUser();
    } catch (err) {
      setErrorInfo({
        message: err?.response?.data?.message || 'Përgjigjet nuk u ruajtën. Provoni përsëri.',
        code: err?.response?.data?.code || null,
      });
      setStatus('error');
    }
  };

  const handleContinue = () => {
    if (taste) {
      if (onComplete) onComplete();
      return;
    }
    if (isLast) {
      finalize();
    } else {
      setIndex((i) => i + 1);
    }
  };

  // ── Render states ──────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className={taste ? 'flex items-center justify-center py-12' : 'min-h-screen bg-cloud flex items-center justify-center'}>
        <Parrot state="idle" size={taste ? 90 : 120} />
      </div>
    );
  }

  if (status === 'error' && taste) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <Parrot state="think" size={100} />
        <p className="text-ink-soft font-semibold max-w-sm">{errorInfo?.message}</p>
        <Button variant="secondary" size="md" onClick={load}>
          Provo përsëri
        </Button>
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="min-h-screen bg-cloud flex flex-col items-center justify-center px-6 text-center gap-6">
        <Parrot state="idle" size={160} />
        <Heading level={2}>S'ke gabime për të përsëritur tani</Heading>
        <p className="text-ink-soft font-semibold max-w-md">
          Bravo! Kthehu pasi të bësh disa mësime — gabimet shfaqen këtu kur vjen koha t'i përsëritësh.
        </p>
        <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>
          Kthehu te paneli
        </Button>
      </div>
    );
  }

  if (status === 'error') {
    const isPremiumBlock = errorInfo?.code === 'PREMIUM_REQUIRED';
    const isLimitBlock = errorInfo?.code === 'DAILY_LESSON_LIMIT_REACHED';
    return (
      <div className="min-h-screen bg-cloud flex flex-col items-center justify-center px-6 text-center gap-6">
        <Parrot state="think" size={150} />
        <Heading level={2}>{isLimitBlock ? 'Mjaft për sot!' : 'Një moment'}</Heading>
        <p className="text-ink-soft font-semibold max-w-md">{errorInfo?.message}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          {(isPremiumBlock || isLimitBlock) && (
            <Button variant="primary" size="lg" onClick={() => navigate('/premium')}>
              Kalo në Premium
            </Button>
          )}
          <Button variant="secondary" size="lg" onClick={() => navigate('/dashboard')}>
            Kthehu te paneli
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'finished' && finalResult) {
    const xp = finalResult.xpEarned ?? 0;
    const streak = finalResult.streak ?? null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-screen bg-cloud flex flex-col items-center justify-center px-6 text-center gap-6"
      >
        <Parrot state="celebrate-big" size={200} />
        <Heading level={1}>{isPractice ? 'Përsëritje e mbaruar!' : 'Mësimi u përfundua!'}</Heading>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          <Card padding="md" className="text-center">
            <p className="text-3xl font-black text-brand-green">+{xp}</p>
            <p className="text-xs font-bold text-ink-soft mt-1">XP të fituar</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-3xl font-black text-accent-yellow">
              {streak ?? '–'} {streak >= 7 ? '🔥' : ''}
            </p>
            <p className="text-xs font-bold text-ink-soft mt-1">Seria ditore</p>
          </Card>
        </div>

        {!isPractice && (
          <p className="text-ink-soft font-semibold">
            {finalResult.correctCount}/{finalResult.total} saktë
            {finalResult.completed ? ' · Mësim i kaluar' : ''}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>
            {isPractice ? 'Përfundo' : 'Mësimi tjetër'}
          </Button>
        </div>
      </motion.div>
    );
  }

  // playing
  const progress = ((index + (currentReveal ? 1 : 0)) / exercises.length) * 100;
  const parrotState = currentReveal ? (currentReveal.correct ? 'cheer' : 'think') : 'idle';
  const correctionText = currentReveal && !currentReveal.correct && current.type === 'spot_alblish'
    ? currentReveal.answer.correct_albanian
    : undefined;

  const body = (
    <div className={taste ? '' : 'max-w-2xl mx-auto'}>
      {/* Single-exercise taste mode hides the internal progress bar; the
          onboarding stepper shows its own dot indicator. */}
      {!taste && (
        <div className="flex items-center gap-3 mb-8">
          <span className="text-sm font-black text-ink whitespace-nowrap">
            {index + 1}/{exercises.length}
          </span>
          <ProgressBar value={progress} />
        </div>
      )}

      <div className="flex justify-center mb-6">
        <Parrot state={parrotState} size={taste ? 100 : 120} correctionText={correctionText} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
        >
          <Card padding="lg">
            {current.type === 'spot_alblish' ? (
              <SpotAlblish
                exercise={current}
                reveal={currentReveal}
                selectedIndex={selected[current.id]?.index ?? null}
                onSelect={handleSelect}
              />
            ) : (
              <ChoiceExercise
                exercise={current}
                reveal={currentReveal}
                selectedValue={selected[current.id]?.value ?? null}
                onSelect={(value) => handleSelect(value)}
              />
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!currentReveal}
          loading={checking}
          onClick={handleContinue}
        >
          Vazhdo
        </Button>
      </div>
    </div>
  );

  if (taste) return body;

  return <div className="min-h-screen bg-cloud px-6 py-6">{body}</div>;
};

export default Lesson;
