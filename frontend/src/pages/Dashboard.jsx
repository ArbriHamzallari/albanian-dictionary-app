import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Flame, Trophy, Target, BarChart3, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import api from '../utils/api.js';

const LEVEL_POINTS = (level) => {
  // Inverse of floor(sqrt(xp/100))+1 = level → xp = (level-1)^2 * 100
  return (level - 1) * (level - 1) * 100;
};

const Dashboard = () => {
  const { user, loading: authLoading, isLoggedIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [recentAttempts, setRecentAttempts] = useState([]);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/hyr');
    }
    // Redirect admin users to admin dashboard
    if (!authLoading && isLoggedIn && isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [authLoading, isLoggedIn, isAdmin, navigate]);

  useEffect(() => {
    if (!user) return;
    // Fetch recent quiz attempts
    api.get(`/profile/${user.profile.uuid}`)
      .then(() => {})
      .catch(() => {});
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <LoadingSpinner />
      </div>
    );
  }

  const { profile, stats, rank, achievements } = user;
  const xp = stats?.xp || 0;
  const level = stats?.level || 1;
  const streak = stats?.streak || 0;
  const totalQuizzes = stats?.total_quizzes || 0;
  const correctAnswers = stats?.correct_answers || 0;
  const totalAnswers = totalQuizzes * 10; // Assuming 10 questions per quiz
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  const currentLevelXp = LEVEL_POINTS(level);
  const nextLevelXp = LEVEL_POINTS(level + 1);
  const progressPct = nextLevelXp > currentLevelXp
    ? Math.min(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100, 100)
    : 100;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Link to="/profili">
          <Avatar filename={profile.avatar_filename} size={80} className="mx-auto mb-4 ring-4 ring-fjalingo-green/20" />
        </Link>
        <h2 className="text-2xl font-black text-heading dark:text-dark-text">
          {profile.username || 'Përdorues'}
        </h2>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="badge badge-green">Niveli {level}</span>
          {rank && <span className="badge badge-blue">#{rank}</span>}
        </div>
      </motion.div>

      {/* Level progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mb-6"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-heading dark:text-dark-text">
            Niveli {level}
          </span>
          <span className="text-sm font-bold text-muted dark:text-dark-muted">
            {xp} / {nextLevelXp} XP
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
      >
        <div className="card text-center py-5">
          <Flame className="w-6 h-6 mx-auto mb-2 text-fjalingo-orange" />
          <p className="text-2xl font-black text-heading dark:text-dark-text">{streak}</p>
          <p className="text-xs font-bold text-muted dark:text-dark-muted">Seria</p>
        </div>
        <div className="card text-center py-5">
          <Star className="w-6 h-6 mx-auto mb-2 text-fjalingo-yellow fill-fjalingo-yellow" />
          <p className="text-2xl font-black text-heading dark:text-dark-text">{xp}</p>
          <p className="text-xs font-bold text-muted dark:text-dark-muted">XP</p>
        </div>
        <div className="card text-center py-5">
          <BarChart3 className="w-6 h-6 mx-auto mb-2 text-fjalingo-blue" />
          <p className="text-2xl font-black text-heading dark:text-dark-text">{totalQuizzes}</p>
          <p className="text-xs font-bold text-muted dark:text-dark-muted">Kuize</p>
        </div>
        <div className="card text-center py-5">
          <Target className="w-6 h-6 mx-auto mb-2 text-fjalingo-purple" />
          <p className="text-2xl font-black text-heading dark:text-dark-text">{accuracy}%</p>
          <p className="text-xs font-bold text-muted dark:text-dark-muted">Saktësi</p>
        </div>
      </motion.div>

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card mb-8"
        >
          <h3 className="text-sm font-black text-heading dark:text-dark-text mb-4">
            <Trophy className="w-4 h-4 inline mr-1" /> ARRITJET ({achievements.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {achievements.map((ach) => (
              <span key={ach.key} className="badge badge-green">
                {ach.name} +{ach.xp_reward}xp
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Link to="/kuizi" className="btn-primary flex-1 text-center">
          Luaj Kuizin
        </Link>
        <Link to="/renditja" className="btn-outline flex-1 text-center">
          Renditja
        </Link>
        <Link to="/profili" className="btn-outline flex-1 text-center">
          Ndrysho Profilin
        </Link>
      </motion.div>
    </div>
  );
};

export default Dashboard;
