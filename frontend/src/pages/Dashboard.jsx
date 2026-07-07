import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Flame, Trophy, Target, BarChart3, Clock, BookOpen, ArrowRight } from 'lucide-react';
import { useAuth, useHasUnlimitedAccess } from '../context/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import PremiumCheckoutButton from '../components/PremiumCheckoutButton.jsx';
import DashboardQuestCard from '../components/DashboardQuestCard.jsx';
import DashboardPracticeCard from '../components/DashboardPracticeCard.jsx';
import LeagueResultToast from '../components/LeagueResultToast.jsx';
import Card from '../components/ui/Card.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import api from '../utils/api.js';
import { t } from '../i18n/index.js';

const LEVEL_POINTS = (level) => {
  // Inverse of floor(sqrt(xp/100))+1 = level → xp = (level-1)^2 * 100
  return (level - 1) * (level - 1) * 100;
};

const Dashboard = () => {
  const { user, loading: authLoading, isLoggedIn } = useAuth();
  const hasUnlimited = useHasUnlimitedAccess();
  const navigate = useNavigate();
  const [recentAttempts, setRecentAttempts] = useState([]);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/hyr');
    }
    // Admins are not redirected away: the Dashboard is the single app home (UI-0),
    // and admins see it with the AdminHomeBanner + their Header link to the panel.
  }, [authLoading, isLoggedIn, navigate]);

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
  // Route through the shared hook so admins/complimentary users also bypass the
  // upsell (not just paid 'premium' tier).
  const isPremium = hasUnlimited;
  const xp = stats?.xp || 0;
  const level = stats?.level || 1;
  const streak = stats?.streak || 0;
  const totalQuizzes = stats?.total_quizzes || 0;
  const correctAnswers = stats?.correct_answers || 0;
  // Server-tracked count of questions actually answered (BUG-5) — the authoritative
  // accuracy denominator. Replaces the old "total_quizzes * 10" assumption, which
  // over-counted whenever a quiz had fewer than 10 questions.
  const totalAnswers = stats?.total_questions || 0;
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  const currentLevelXp = LEVEL_POINTS(level);
  const nextLevelXp = LEVEL_POINTS(level + 1);
  const progressPct = nextLevelXp > currentLevelXp
    ? Math.min(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100, 100)
    : 100;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <LeagueResultToast />
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
          {profile.username || t('dashboard.userFallback')}
        </h2>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="badge badge-green">{t('dashboard.level', { level })}</span>
          {rank && <span className="badge badge-blue">#{rank}</span>}
          <span className={isPremium ? 'badge badge-yellow' : 'badge badge-blue'}>
            {isPremium ? t('dashboard.premiumBadge') : t('dashboard.freeBadge')}
          </span>
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
            {t('dashboard.level', { level })}
          </span>
          <span className="text-sm font-bold text-muted dark:text-dark-muted">
            {xp} / {nextLevelXp} XP
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </motion.div>

      {/* Streak (Seria ditore) + daily quest (Sfida e ditës) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
      >
        <Card padding="md" className="flex items-center gap-4">
          {streak >= 7 ? (
            <Parrot state="streak-fire" size={64} />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-yellow/15">
              <Flame className="h-8 w-8 text-accent-yellow" />
            </span>
          )}
          <div>
            <p className="text-3xl font-black text-ink">
              {streak} <span className="text-xl">🔥</span>
            </p>
            <p className="text-xs font-bold text-ink-soft">
              {t('dashboard.streakDaily')}{streak >= 7 ? t('dashboard.streakOnFireSuffix') : ''}
            </p>
          </div>
        </Card>
        <DashboardQuestCard />
      </motion.div>

      {/* Lessons (Mësimet) — the three-type lesson player */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.13 }}
        className="mb-6"
      >
        <Link to="/mesimet" className="card card-hover flex items-center gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-fjalingo-green/15">
            <BookOpen className="h-6 w-6 text-fjalingo-green" />
          </span>
          <div className="flex-1">
            <p className="font-black text-heading dark:text-dark-text">{t('lessonsBrowse.dashTitle')}</p>
            <p className="text-xs font-bold text-muted dark:text-dark-muted">{t('lessonsBrowse.dashDesc')}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted dark:text-dark-muted flex-shrink-0" />
        </Link>
      </motion.div>

      {/* Practice Mistakes (Përsërit gabimet) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="mb-6"
      >
        <DashboardPracticeCard />
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
          <p className="text-xs font-bold text-muted dark:text-dark-muted">{t('dashboard.stat.streak')}</p>
        </div>
        <div className="card text-center py-5">
          <Star className="w-6 h-6 mx-auto mb-2 text-fjalingo-yellow fill-fjalingo-yellow" />
          <p className="text-2xl font-black text-heading dark:text-dark-text">{xp}</p>
          <p className="text-xs font-bold text-muted dark:text-dark-muted">XP</p>
        </div>
        <div className="card text-center py-5">
          <BarChart3 className="w-6 h-6 mx-auto mb-2 text-fjalingo-blue" />
          <p className="text-2xl font-black text-heading dark:text-dark-text">{totalQuizzes}</p>
          <p className="text-xs font-bold text-muted dark:text-dark-muted">{t('dashboard.stat.quizzes')}</p>
        </div>
        <div className="card text-center py-5">
          <Target className="w-6 h-6 mx-auto mb-2 text-fjalingo-purple" />
          <p className="text-2xl font-black text-heading dark:text-dark-text">{accuracy}%</p>
          <p className="text-xs font-bold text-muted dark:text-dark-muted">{t('dashboard.stat.accuracy')}</p>
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
            <Trophy className="w-4 h-4 inline mr-1" /> {t('dashboard.achievementsHeading')} ({achievements.length})
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
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.23 }}
          className="card mb-6 text-center"
        >
          <h3 className="text-lg font-black text-heading dark:text-dark-text mb-2">
            {t('dashboard.premiumUpsell.title')}
          </h3>
          <p className="text-sm font-semibold text-muted dark:text-dark-muted mb-4">
            {t('dashboard.premiumUpsell.desc')}
          </p>
          <PremiumCheckoutButton />
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
          {t('dashboard.actions.playQuiz')}
        </Link>
        <Link to="/liga" className="btn-outline flex-1 text-center">
          {t('dashboard.actions.league')}
        </Link>
        <Link to="/renditja" className="btn-outline flex-1 text-center">
          {t('nav.leaderboard')}
        </Link>
        <Link to="/profili" className="btn-outline flex-1 text-center">
          {t('dashboard.actions.editProfile')}
        </Link>
      </motion.div>
    </div>
  );
};

export default Dashboard;
