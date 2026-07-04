import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Lock, BookOpen } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import Seo from '../components/Seo.jsx';
import { t } from '../i18n/index.js';

// The three exercise-type names are the brand wedge — surfaced verbatim so the
// learner sees what they'll practice. Reuses the existing home "si funksionon"
// strings (single source) rather than duplicating them.
const TYPE_NAME_KEYS = ['home.how.spot.title', 'home.how.translate.title', 'home.how.fill.title'];

// Browse the curriculum (units -> lessons) and drop into the three-type lesson
// player. The lesson player itself enforces premium/daily-limit at play time.
const Lessons = () => {
  const navigate = useNavigate();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [units, setUnits] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isLoggedIn) navigate('/hyr');
  }, [authLoading, isLoggedIn, navigate]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/lessons');
        if (cancelled) return;
        setUnits(res.data.units || []);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.message || t('lessonsBrowse.loadError'));
        setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  if (authLoading || status === 'loading') {
    return <div className="max-w-3xl mx-auto px-6 py-16"><LoadingSpinner /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Seo
        title="Mësimet — Fjalingo"
        description="Mëso shqipen e vërtetë me tri lloje ushtrimesh: gjej fjalën e huazuar, zgjidh fjalën e saktë dhe plotëso vendin bosh."
        path="/mesimet"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <span className="text-5xl block mb-3">📚</span>
        <h2 className="text-3xl font-black text-heading dark:text-dark-text mb-2">{t('lessonsBrowse.title')}</h2>
        <p className="text-muted dark:text-dark-muted font-semibold">{t('lessonsBrowse.subtitle')}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {TYPE_NAME_KEYS.map((key) => (
            <span key={key} className="badge badge-green">{t(key)}</span>
          ))}
        </div>
      </motion.div>

      {status === 'error' && <ErrorMessage message={error} />}

      {status === 'ready' && units.length === 0 && (
        <div className="text-center py-12">
          <Parrot state="idle" size={120} />
          <p className="text-muted dark:text-dark-muted font-semibold mt-4">{t('lessonsBrowse.empty')}</p>
        </div>
      )}

      <div className="space-y-6">
        {units.map((unit, ui) => (
          <motion.section
            key={unit.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: Math.min(ui * 0.04, 0.3) }}
            className="card"
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-lg font-black text-heading dark:text-dark-text">
                {unit.icon ? `${unit.icon} ` : ''}{unit.title}
              </h3>
              {unit.locked && (
                <span className="badge badge-yellow inline-flex items-center gap-1 flex-shrink-0">
                  <Lock className="w-3 h-3" /> {t('lessonsBrowse.premiumBadge')}
                </span>
              )}
            </div>
            {unit.description && (
              <p className="text-sm font-semibold text-muted dark:text-dark-muted mb-4">{unit.description}</p>
            )}

            {unit.locked ? (
              <button onClick={() => navigate('/premium')} className="btn-outline text-sm mt-2">
                {t('lessonsBrowse.premiumCta')}
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unit.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => navigate(`/mesimi/${lesson.id}`)}
                    aria-label={t('lessonsBrowse.lessonAria', { title: lesson.title })}
                    className="card card-hover flex items-center gap-3 text-left py-3"
                  >
                    <span
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                        lesson.completed
                          ? 'bg-fjalingo-green text-white'
                          : 'bg-border dark:bg-dark-border text-heading dark:text-dark-text'
                      }`}
                    >
                      {lesson.completed ? <Check className="w-5 h-5" /> : <BookOpen className="w-4 h-4" />}
                    </span>
                    <span className="font-bold text-heading dark:text-dark-text">{lesson.title}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.section>
        ))}
      </div>
    </div>
  );
};

export default Lessons;
