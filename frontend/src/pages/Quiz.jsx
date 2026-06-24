import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowRight, Timer, Star, Trophy, RotateCcw, X } from 'lucide-react';
import api from '../utils/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const TOTAL_QUESTIONS = 10;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const Quiz = () => {
  const { isLoggedIn, getGuestProgress, saveGuestProgress, loadUser } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | playing | answered | finished
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [answers, setAnswers] = useState([]);
  // Submit-time error is kept separate from `error`: `error` swaps in the
  // full-page error view, which must NOT happen on the results screen. A failed
  // submit shows an inline banner and the results stay visible.
  const [submitError, setSubmitError] = useState('');
  // True once the backend has graded and returned the score for a logged-in
  // session. Local guest quizzes are always "known" (graded client-side).
  const [resultConfirmed, setResultConfirmed] = useState(false);

  const buildQuestions = useCallback(async () => {
    try {
      setStatus('loading');
      setError('');
      setSubmitError('');
      setResultConfirmed(false);
      setSessionId(null);
      setAnswers([]);

      if (isLoggedIn) {
        const res = await api.post('/progress/quiz/start');
        setSessionId(res.data.sessionId);
        setQuestions(res.data.questions || []);
        setCurrent(0);
        setScore(0);
        setCorrect(0);
        setSelected(null);
        setTimer(0);
        setStatus('playing');
        return;
      }

      const res = await api.get('/words/popular');
      const words = res.data.words || [];

      if (words.length < 4) {
        setError('Nuk ka mjaft fjalë për kuizin. Nevojiten të paktën 4 fjalë.');
        return;
      }

      const quizQuestions = [];
      const shuffled = shuffleArray(words);
      const count = Math.min(TOTAL_QUESTIONS, shuffled.length);

      for (let i = 0; i < count; i++) {
        const correctWord = shuffled[i];
        const wrongAnswers = shuffled
          .filter((w) => w.id !== correctWord.id)
          .slice(0, 3)
          .map((w) => w.correct_albanian);

        const options = shuffleArray([correctWord.correct_albanian, ...wrongAnswers]);

        quizQuestions.push({
          borrowed_word: correctWord.borrowed_word,
          correct_answer: correctWord.correct_albanian,
          options,
        });
      }

      setQuestions(quizQuestions);
      setCurrent(0);
      setScore(0);
      setCorrect(0);
      setSelected(null);
      setTimer(0);
      setStatus('playing');
    } catch (err) {
      setError(err?.response?.data?.message || 'Nuk mund të ngarkohet kuizi. Provoni përsëri.');
    }
  }, [isLoggedIn]);

  useEffect(() => {
    buildQuestions();
  }, [buildQuestions]);

  // Timer
  useEffect(() => {
    if (status !== 'playing' && status !== 'answered') return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleAnswer = (option) => {
    if (status !== 'playing') return;
    setSelected(option);
    setStatus('answered');

    if (sessionId) {
      setAnswers((prev) => [...prev, { questionId: questions[current].id, answer: option }]);
      return;
    }

    const isCorrect = option === questions[current].correct_answer;
    if (isCorrect) {
      setCorrect((c) => c + 1);
      setScore((s) => s + 100);
      confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 } });
    }
  };

  // Server-graded submission for logged-in sessions. On failure we keep the
  // results screen up and surface an inline banner with a retry — we never
  // swap in the full-page error view, so the screen can't go blank or show a
  // raw "Statistikat nuk u gjetën". // TODO i18n
  const submitResults = async () => {
    try {
      const res = await api.post('/progress/quiz', { sessionId, answers });
      const earnedCorrect = res.data.correctAnswers ?? 0;
      const earnedScore = res.data.score ?? 0;
      setCorrect(earnedCorrect);
      setScore(earnedScore);
      setResultConfirmed(true);
      setSubmitError('');
      loadUser();
      if (earnedCorrect === questions.length) {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
      }
    } catch (err) {
      console.error('Quiz submit failed:', err);
      setResultConfirmed(false);
      setSubmitError('Rezultati nuk u ruajt në server. Provo ta ruash përsëri.');
    }
  };

  const nextQuestion = async () => {
    if (current + 1 >= questions.length) {
      setStatus('finished');

      if (isLoggedIn && sessionId) {
        await submitResults();
      } else if (!isLoggedIn) {
        // Save guest progress locally
        const gp = getGuestProgress();
        saveGuestProgress({
          xp: gp.xp + score,
          total_quizzes: gp.total_quizzes + 1,
          correct_answers: gp.correct_answers + correct,
          streak: gp.streak + 1, // Approximate
        });
        // Show guest conversion modal
        setShowGuestModal(true);
      }

      if (!sessionId && correct === questions.length) {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
      }
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setStatus('playing');
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-4xl mb-4">😔</p>
        <p className="text-lg font-bold text-heading dark:text-dark-text mb-4">{error}</p>
        <button onClick={buildQuestions} className="btn-primary">
          Provo Përsëri
        </button>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (status === 'finished') {
    // For a logged-in session the score is only trustworthy once the backend
    // confirms it. Guest quizzes are graded locally, so they are always known.
    const resultsKnown = !sessionId || resultConfirmed;
    const percentage = resultsKnown ? Math.round((correct / questions.length) * 100) : null;
    return (
      <>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto px-6 py-16 text-center"
        >
          <span className="text-6xl block mb-4">
            {!resultsKnown ? '⚠️' : percentage >= 70 ? '🎉' : '💪'}
          </span>
          <h2 className="text-3xl font-black text-heading dark:text-dark-text mb-2">
            {!resultsKnown ? 'Kuizi përfundoi' : percentage >= 70 ? 'Shkëlqyeshëm!' : 'Punë e mirë!'}
          </h2>
          <p className="text-lg font-semibold text-muted dark:text-dark-muted mb-6">
            Rezultati yt
          </p>

          {submitError && (
            <div className="card mb-6 border-fjalingo-yellow bg-fjalingo-yellow/15 text-left">
              <p className="text-sm font-bold text-heading dark:text-dark-text mb-3">
                {submitError}
              </p>
              <button
                onClick={submitResults}
                className="btn-outline inline-flex items-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Provo ta ruash përsëri
              </button>
            </div>
          )}

          <div className="card mb-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-black text-fjalingo-green">{resultsKnown ? correct : '—'}</p>
                <p className="text-xs font-bold text-muted dark:text-dark-muted">Saktë</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-fjalingo-blue">{resultsKnown ? score : '—'}</p>
                <p className="text-xs font-bold text-muted dark:text-dark-muted">Pikë</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-fjalingo-yellow">{formatTime(timer)}</p>
                <p className="text-xs font-bold text-muted dark:text-dark-muted">Koha</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={buildQuestions} className="btn-primary inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Luaj Përsëri
            </button>
            <Link to="/arritjet" className="btn-outline inline-flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Arritjet
            </Link>
          </div>
        </motion.div>

        {/* Guest conversion modal */}
        <AnimatePresence>
          {showGuestModal && !isLoggedIn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
              onClick={() => setShowGuestModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl w-full max-w-sm p-6 text-center"
              >
                <button
                  onClick={() => setShowGuestModal(false)}
                  className="absolute top-3 right-3 p-1 hover:bg-card dark:hover:bg-dark-card rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-5xl block mb-4">🔥</span>
                <h3 className="text-xl font-black text-heading dark:text-dark-text mb-2">
                  Ruaje progresin!
                </h3>
                <p className="text-sm text-muted dark:text-dark-muted font-semibold mb-6">
                  Krijo profil dhe fito shpërblim çdo ditë për 7 ditë rresht!
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowGuestModal(false);
                      navigate('/regjistrohu');
                    }}
                    className="btn-primary w-full"
                  >
                    Krijo profil
                  </button>
                  <button
                    onClick={() => setShowGuestModal(false)}
                    className="btn-outline w-full"
                  >
                    Vazhdo si mysafir
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  const question = questions[current];
  const isCorrectAnswer = (opt) => opt === question.correct_answer;
  const progress = ((current + (status === 'answered' ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-heading dark:text-dark-text">
            {current + 1}/{questions.length}
          </span>
          <div className="progress-bar w-32 sm:w-48">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-sm font-bold text-fjalingo-yellow">
            <Star className="w-4 h-4 fill-fjalingo-yellow text-fjalingo-yellow" /> {score}
          </span>
          <span className="flex items-center gap-1 text-sm font-bold text-muted dark:text-dark-muted">
            <Timer className="w-4 h-4" /> {formatTime(timer)}
          </span>
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card mb-6">
            <p className="text-sm font-semibold text-muted dark:text-dark-muted mb-2">
              Cila është fjala e saktë për:
            </p>
            <h3 className="text-3xl font-black text-heading dark:text-dark-text">
              "{question.borrowed_word}"
            </h3>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options.map((option, i) => {
              const letter = ['A', 'B', 'C', 'D'][i];
              let optClass = 'card card-hover cursor-pointer';

              if (status === 'answered') {
                if (sessionId) {
                  if (selected === option) {
                    optClass = 'card border-fjalingo-blue bg-fjalingo-blue/10 cursor-default';
                  } else {
                    optClass = 'card opacity-50 cursor-default';
                  }
                } else if (isCorrectAnswer(option)) {
                  optClass = 'card border-fjalingo-green bg-fjalingo-green/10 cursor-default';
                } else if (selected === option && !isCorrectAnswer(option)) {
                  optClass = 'card border-fjalingo-red bg-fjalingo-red/10 cursor-default animate-shake';
                } else {
                  optClass = 'card opacity-50 cursor-default';
                }
              }

              return (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
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

          {/* Answered feedback */}
          {status === 'answered' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              {sessionId ? (
                <p className="text-lg font-black text-heading dark:text-dark-text mb-3">
                  Përgjigja u ruajt.
                </p>
              ) : isCorrectAnswer(selected) ? (
                <p className="text-lg font-black text-fjalingo-green mb-3">
                  Saktë! +100 Pikë
                </p>
              ) : (
                <p className="text-lg font-black text-fjalingo-red mb-3">
                  Gabim! Përgjigja: <span className="text-fjalingo-green">{question.correct_answer}</span>
                </p>
              )}
              <button onClick={nextQuestion} className="btn-primary inline-flex items-center gap-2">
                {current + 1 >= questions.length ? 'Shiko Rezultatin' : 'Vazhdo'} <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Quiz;
