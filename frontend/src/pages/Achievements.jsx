import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

// Static achievements list (matches backend profileController ACHIEVEMENTS)
const ALL_ACHIEVEMENTS = [
  { id: 'first_search', name: 'Kërkim i Parë', description: 'Kërko fjalën e parë', icon: '🔍', points: 50 },
  { id: 'first_quiz', name: 'Kuizier', description: 'Përfundo kuizin e parë', icon: '🎮', points: 50 },
  { id: 'quiz_master', name: 'Mjeshtër Kuizi', description: 'Përfundo 10 kuize', icon: '🧠', points: 200 },
  { id: 'perfect_quiz', name: 'Perfekt!', description: 'Merr 10/10 në kuiz', icon: '💯', points: 300 },
  { id: 'streak_3', name: 'Seria 3', description: 'Arrit serinë 3-ditore', icon: '🔥', points: 100 },
  { id: '7_day_streak', name: 'Seria 7-Ditore', description: 'Luaj kuizin 7 ditë rresht', icon: '🔥', points: 500 },
  { id: 'streak_30', name: 'Seria 30', description: 'Arrit serinë 30-ditore', icon: '🔥', points: 500 },
  { id: 'points_500', name: 'Grumbullues', description: 'Merr 500 pikë', icon: '⭐', points: 100 },
  { id: 'points_1000', name: 'Ekspert', description: 'Merr 1000 pikë', icon: '🏆', points: 200 },
  { id: 'points_5000', name: 'Legjendë', description: 'Merr 5000 pikë', icon: '👑', points: 500 },
  { id: 'word_explorer', name: 'Eksplorues', description: 'Shiko 20 fjalë', icon: '📚', points: 100 },
  { id: 'suggester', name: 'Kontributor', description: 'Propozo një fjalë', icon: '💡', points: 50 },
];

const Achievements = () => {
  const { user, loading } = useAuth();

  const unlockedKeys = (user?.achievements || []).map((a) => a.key);
  const unlockedCount = unlockedKeys.length;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <span className="text-5xl block mb-3">🏆</span>
        <h2 className="text-3xl font-black text-heading dark:text-dark-text mb-2">
          Arritjet
        </h2>
        <p className="text-muted dark:text-dark-muted font-semibold">
          {unlockedCount} nga {ALL_ACHIEVEMENTS.length} shkyçur
        </p>
        <div className="progress-bar w-64 mx-auto mt-3">
          <div
            className="progress-bar-fill"
            style={{ width: `${ALL_ACHIEVEMENTS.length ? (unlockedCount / ALL_ACHIEVEMENTS.length) * 100 : 0}%` }}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {ALL_ACHIEVEMENTS.map((ach, i) => {
          const unlocked = unlockedKeys.includes(ach.id);
          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`card text-center py-6 relative ${
                unlocked ? 'border-fjalingo-green/30' : 'opacity-60 grayscale'
              }`}
            >
              <span className="text-4xl block mb-2">{ach.icon}</span>
              <h4 className="text-sm font-black text-heading dark:text-dark-text mb-1">
                {ach.name}
              </h4>
              <p className="text-xs font-semibold text-muted dark:text-dark-muted mb-2">
                {ach.description}
              </p>
              <span className={`badge ${unlocked ? 'badge-green' : 'badge-yellow'}`}>
                {unlocked ? `+${ach.points}pt` : `+${ach.points}pt`}
              </span>

              <div className="absolute top-3 right-3">
                {unlocked ? (
                  <Check className="w-4 h-4 text-fjalingo-green" />
                ) : (
                  <Lock className="w-4 h-4 text-muted dark:text-dark-muted" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Achievements;
