import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Users, Home as HomeIcon, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Card from '../components/ui/Card.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import DashboardQuestCard from '../components/DashboardQuestCard.jsx';
import DashboardPracticeCard from '../components/DashboardPracticeCard.jsx';
import { t } from '../i18n/index.js';

// xp at the start of a level: inverse of floor(sqrt(xp/100))+1 (mirrors Dashboard).
const levelXp = (level) => (level - 1) * (level - 1) * 100;

// Premium-only landing surface (UX-4). Layout: learning-path hero + a row of
// engagement widgets, in the locked priority order:
// quests -> gold league -> practice (unlimited) -> friends+chat -> family.
// Reuses existing cards; no new visual language.
const PremiumHome = () => {
  const { user } = useAuth();
  const profile = user?.profile;
  const stats = user?.stats || {};
  const xp = stats.xp || 0;
  const level = stats.level || 1;
  const streak = stats.streak || 0;

  const current = levelXp(level);
  const next = levelXp(level + 1);
  const progressPct = next > current ? Math.min(((xp - current) / (next - current)) * 100, 100) : 100;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Learning-path hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card padding="lg" className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Parrot state={streak >= 7 ? 'streak-fire' : 'idle'} size={96} />
          <div className="flex-1">
            <div className="mb-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-black text-heading dark:text-dark-text">
                {t('premiumHome.greeting', { name: profile?.username || '' })}
              </h1>
              <span className="badge badge-yellow">👑 {t('premiumHome.premiumBadge')}</span>
            </div>
            <p className="mb-3 text-sm font-semibold text-muted dark:text-dark-muted">
              {t('premiumHome.heroSubtitle')}
            </p>
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-muted dark:text-dark-muted">
              <span>{t('premiumHome.level', { level })}</span>
              <span>{xp} / {next} XP</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <Link to="/kuizi" className="btn-primary mt-4 inline-block text-center">
              {t('premiumHome.continue')}
            </Link>
          </div>
        </Card>
      </motion.div>

      {/* Widget row — engagement-first priority order */}
      <h2 className="mb-4 mt-8 text-sm font-black uppercase tracking-wide text-muted dark:text-dark-muted">
        {t('premiumHome.widgetsHeading')}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. Weekly/monthly quests */}
        <DashboardQuestCard />

        {/* 2. Gold-league entrance */}
        <WidgetLink to="/liga" icon={Crown} color="text-accent-yellow" titleKey="league" />

        {/* 3. Practice mistakes (unlimited) */}
        <DashboardPracticeCard />

        {/* 4. Friends + safe chat shortcut */}
        <WidgetLink to="/miqte" icon={Users} color="text-fjalingo-blue" titleKey="friends" />

        {/* 5. Family profiles entry */}
        <WidgetLink to="/profili" icon={HomeIcon} color="text-fjalingo-purple" titleKey="family" />
      </div>
    </div>
  );
};

const WidgetLink = ({ to, icon: Icon, color, titleKey }) => (
  <Link to={to} className="card card-hover flex flex-col">
    <Icon className={`mb-3 h-7 w-7 ${color}`} aria-hidden="true" />
    <h3 className="mb-1 text-base font-black text-heading dark:text-dark-text">
      {t(`premiumHome.${titleKey}.title`)}
    </h3>
    <p className="mb-4 flex-1 text-sm font-semibold text-muted dark:text-dark-muted">
      {t(`premiumHome.${titleKey}.desc`)}
    </p>
    <span className="inline-flex items-center gap-1 text-sm font-bold text-fjalingo-green">
      {t('premiumHome.open')} <ArrowRight className="h-4 w-4" />
    </span>
  </Link>
);

export default PremiumHome;
