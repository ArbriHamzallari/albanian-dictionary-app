import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import api from '../utils/api.js';
import { updateStreak, awardPoints, getStreak } from '../utils/userService.js';

const DailyChallengeCard = () => {
  const [word, setWord] = useState(null);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('idle'); // idle | correct | wrong
  const [streak, setStreakData] = useState({ current_streak: 0, longest_streak: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wordRes, streakRes] = await Promise.allSettled([
          api.get('/words/word-of-the-day'),
          getStreak(),
        ]);
        if (wordRes.status === 'fulfilled') setWord(wordRes.value.data.word);
        if (streakRes.status === 'fulfilled') setStreakData(streakRes.value);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const checkAnswer = async () => {
    if (!word || !answer.trim()) return;

    const correct = answer.trim().toLowerCase() === word.correct_albanian.toLowerCase();

    if (correct) {
      setStatus('correct');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      const newStreak = await updateStreak();
      if (newStreak) setStreakData(newStreak);
      await awardPoints(100);
    } else {
      setStatus('wrong');
    }
  };

  if (loading) return null;
  if (!word) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card border-fjalingo-yellow/40 bg-gradient-to-br from-fjalingo-yellow/10 to-fjalingo-orange/5 dark:from-fjalingo-yellow/5 dark:to-fjalingo-orange/3"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-heading dark:text-dark-text">
          🎯 Sfida e Ditës
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-flame-flicker">🔥</span>
          <div className="text-right">
            <p className="text-xl font-black text-fjalingo-orange leading-none">{streak.current_streak}</p>
            <p className="text-[10px] font-bold text-muted dark:text-dark-muted">Ditë Seria</p>
          </div>
        </div>
      </div>

      {status === 'idle' && (
        <>
          <p className="text-sm font-semibold text-muted dark:text-dark-muted mb-1">
            Cila është fjala e saktë për:
          </p>
          <p className="text-2xl font-black text-heading dark:text-dark-text mb-4">
            {word.borrowed_word}
          </p>
          <div className="flex gap-2">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
              placeholder="Shkruaj përgjigjen..."
              className="input-field flex-1"
            />
            <button onClick={checkAnswer} className="btn-primary whitespace-nowrap">
              Kontrollo
            </button>
          </div>
        </>
      )}

      {status === 'correct' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-4"
        >
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-xl font-black text-fjalingo-green">Saktë!</p>
          <p className="text-lg font-bold text-heading dark:text-dark-text mt-1">
            {word.borrowed_word} → <span className="text-fjalingo-green">{word.correct_albanian}</span>
          </p>
          <p className="text-sm font-bold text-fjalingo-green mt-2">+100 Pikë! ⭐</p>
        </motion.div>
      )}

      {status === 'wrong' && (
        <motion.div
          initial={{ x: -10 }}
          animate={{ x: 0 }}
          className="text-center py-4"
        >
          <p className="text-xl font-black text-fjalingo-red mb-2">Provo përsëri!</p>
          <p className="text-sm text-muted dark:text-dark-muted mb-3">
            Përgjigja e saktë: <strong className="text-fjalingo-green">{word.correct_albanian}</strong>
          </p>
          <button
            onClick={() => { setStatus('idle'); setAnswer(''); }}
            className="btn-outline text-sm py-2 px-4"
          >
            Provo përsëri
          </button>
        </motion.div>
      )}

      {streak.longest_streak > 0 && (
        <p className="text-xs font-semibold text-muted dark:text-dark-muted mt-3 text-right">
          Rekord: {streak.longest_streak} ditë
        </p>
      )}
    </motion.div>
  );
};

export default DailyChallengeCard;
