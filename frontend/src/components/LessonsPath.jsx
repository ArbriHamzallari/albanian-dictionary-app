import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Lock, BookOpen } from 'lucide-react';
import { t } from '../i18n/index.js';

// The curriculum path (units → lessons) with completion state. Presentational only —
// the caller fetches `/lessons` and passes `units`. Shared by the full Mësimet page
// (/mesimet) and the Rruga roadmap (UI-3) so the path renders identically in both,
// with no forked copy. Behaviour is unchanged from the original Lessons markup.
const LessonsPath = ({ units }) => {
  const navigate = useNavigate();

  return (
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
  );
};

export default LessonsPath;
