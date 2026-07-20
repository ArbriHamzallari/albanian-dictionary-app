import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Target, CalendarDays, Compass, Search, ArrowRight, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Heading from '../components/ui/Heading.jsx';
import Card from '../components/ui/Card.jsx';
import DashboardQuestCard from '../components/DashboardQuestCard.jsx';
import LessonsPath from '../components/LessonsPath.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import Seo from '../components/Seo.jsx';
import { t } from '../i18n/index.js';

// Rruga (UI-3): the personal roadmap — YOUR journey. Streak context, the daily loop
// (Sfida e Ditës + Fjala e Ditës), the lessons path with progress, and a discovery
// block (Origjina + Kërko). Reuses existing components/endpoints — zero backend changes.
// This is the "one more lesson" surface; the word-origins history now lives only at
// /origjina (reachable from the discovery block below), no longer squatting this slot.
const EntryCard = ({ to, icon: Icon, label, tint }) => (
  <Link to={to} className="card card-hover flex items-center gap-3 py-4">
    <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${tint}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <span className="min-w-0 flex-1 truncate text-sm font-black text-heading dark:text-dark-text">{label}</span>
    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted dark:text-dark-muted" aria-hidden="true" />
  </Link>
);

const Roadmap = () => {
  const { user, loading: authLoading, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [pathStatus, setPathStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    if (!authLoading && !isLoggedIn) navigate('/hyr');
  }, [authLoading, isLoggedIn, navigate]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let active = true;
    api.get('/lessons')
      .then((res) => { if (active) { setUnits(res.data.units || []); setPathStatus('ready'); } })
      .catch(() => { if (active) setPathStatus('error'); });
    return () => { active = false; };
  }, [isLoggedIn]);

  if (authLoading || !user) {
    return <div className="max-w-3xl mx-auto px-6 py-16"><LoadingSpinner /></div>;
  }

  const streak = user.stats?.streak || 0;
  const level = user.stats?.level || 1;
  let completed = 0;
  let total = 0;
  for (const unit of units) {
    for (const lesson of unit.lessons || []) {
      total += 1;
      if (lesson.completed) completed += 1;
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Seo title="Rruga — Fjalingo" description={t('TODO_SQ_roadmap_subtitle')} path="/rruga" />

      {/* Header + streak context */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between gap-4"
      >
        <div>
          <Heading level={2}>{t('TODO_SQ_roadmap_title')}</Heading>
          <p className="mt-1 font-semibold text-muted dark:text-dark-muted">{t('TODO_SQ_roadmap_subtitle')}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          {streak >= 7 ? (
            <Parrot state="streak-fire" size={56} />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-yellow/15">
              <Flame className="h-6 w-6 text-accent-yellow" aria-hidden="true" />
            </span>
          )}
          <div className="text-right">
            <p className="text-2xl font-black text-heading dark:text-dark-text">{streak} 🔥</p>
            <p className="text-[11px] font-bold text-muted dark:text-dark-muted">
              {t('dashboard.streakDaily')} · {t('dashboard.level', { level })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Daily loop */}
      <section className="mb-8">
        <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-muted dark:text-dark-muted">
          {t('TODO_SQ_roadmap_daily_heading')}
        </h3>
        <div className="mb-3"><DashboardQuestCard /></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <EntryCard to="/sfida-e-dites" icon={Target} label={t('questCard.label')} tint="bg-accent-purple/15 text-accent-purple" />
          <EntryCard to="/fjala-e-dites" icon={CalendarDays} label={t('TODO_SQ_dashboard_wotd')} tint="bg-accent-yellow/15 text-accent-yellow" />
        </div>
      </section>

      {/* The lessons path */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-black uppercase tracking-wide text-muted dark:text-dark-muted">
            {t('TODO_SQ_roadmap_path_heading')}
          </h3>
          {pathStatus === 'ready' && total > 0 && (
            <span className="text-xs font-bold text-muted dark:text-dark-muted">
              {t('TODO_SQ_dashboard_lessons_completed', { completed, total })}
            </span>
          )}
        </div>

        {pathStatus === 'ready' && total > 0 && (
          <div className="progress-bar mb-4">
            <div className="progress-bar-fill" style={{ width: `${Math.round((completed / total) * 100)}%` }} />
          </div>
        )}

        {pathStatus === 'loading' && (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-line dark:bg-dark-border" />
            <div className="h-24 animate-pulse rounded-2xl bg-line dark:bg-dark-border" />
          </div>
        )}
        {pathStatus === 'ready' && units.length > 0 && <LessonsPath units={units} />}
        {pathStatus === 'ready' && units.length === 0 && (
          <Card padding="md" className="text-center">
            <Parrot state="idle" size={96} />
            <p className="mt-3 font-semibold text-muted dark:text-dark-muted">{t('lessonsBrowse.empty')}</p>
          </Card>
        )}
      </section>

      {/* Discover — origins history + dictionary search (no longer in the nav) */}
      <section>
        <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-muted dark:text-dark-muted">
          {t('TODO_SQ_roadmap_discover_heading')}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link to="/origjina" className="card card-hover flex items-start gap-3 py-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green/15">
              <Compass className="h-5 w-5 text-brand-green" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-heading dark:text-dark-text">{t('nav.origins')}</span>
              <span className="mt-0.5 block text-xs font-semibold text-muted dark:text-dark-muted line-clamp-2">{t('origins.lead')}</span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted dark:text-dark-muted" aria-hidden="true" />
          </Link>
          <Link to="/kerko" className="card card-hover flex items-start gap-3 py-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green/15">
              <Search className="h-5 w-5 text-brand-green" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-heading dark:text-dark-text">{t('mobilenav.search')}</span>
              <span className="mt-0.5 block text-xs font-semibold text-muted dark:text-dark-muted line-clamp-2">{t('TODO_SQ_roadmap_search_desc')}</span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted dark:text-dark-muted" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Roadmap;
