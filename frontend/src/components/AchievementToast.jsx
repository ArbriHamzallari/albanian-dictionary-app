import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.jsx';
import Button from './ui/Button.jsx';
import Parrot from './mascot/Parrot.jsx';
import { t } from '../i18n/index.js';

// Global celebration for a freshly-unlocked achievement. Fed by AuthContext's
// recentAchievements queue (quiz submit + search + suggest all enqueue keys).
// Shows one at a time; the achievement's name/description come from the DB via
// the refreshed user, so no achievement copy lives in the client.
const AchievementToast = () => {
  const navigate = useNavigate();
  const { user, recentAchievements, dismissAchievement } = useAuth();
  const currentKey = recentAchievements[0] || null;
  const ach = user?.achievements?.find((a) => a.key === currentKey) || null;

  useEffect(() => {
    if (!currentKey) return;
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.4 } });
  }, [currentKey]);

  return (
    <AnimatePresence>
      {currentKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={dismissAchievement}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('achievementToast.eyebrow')}
            className="relative w-full max-w-sm rounded-3xl border border-line bg-paper p-6 text-center"
          >
            <button
              type="button"
              onClick={dismissAchievement}
              aria-label={t('common.close')}
              className="absolute right-3 top-3 rounded-xl p-1 hover:bg-cloud"
            >
              <X className="h-5 w-5 text-ink-soft" />
            </button>

            <div className="flex justify-center">
              <Parrot state="celebrate-big" size={150} />
            </div>
            <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
              {t('achievementToast.eyebrow')}
            </p>
            <h3 className="mt-1 text-2xl font-black text-ink">
              {ach?.name || t('achievementToast.fallbackTitle')}
            </h3>
            {ach?.description && (
              <p className="mt-2 text-sm font-semibold text-ink-soft">{ach.description}</p>
            )}
            {ach?.xp_reward > 0 && (
              <p className="mt-3 inline-block rounded-full bg-brand-green/10 px-4 py-1 text-sm font-black text-brand-green">
                +{ach.xp_reward} XP
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => { dismissAchievement(); navigate('/arritjet'); }}
              >
                {t('achievementToast.viewCta')}
              </Button>
              <Button variant="secondary" size="md" fullWidth onClick={dismissAchievement}>
                {t('common.close')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementToast;
