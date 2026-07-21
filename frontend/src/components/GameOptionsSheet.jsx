import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Lock, Check } from 'lucide-react';
import api from '../utils/api.js';
import { useHasUnlimitedAccess } from '../context/AuthContext.jsx';
import Button from './ui/Button.jsx';
import { t } from '../i18n/index.js';

const FREE_ORIGIN = 'anglisht';

// One shared options sheet for the Luaj hub (UI-4). It exposes ONLY the personalization
// the existing POST /progress/quiz/start already accepts: the origin world. Question
// count is fixed server-side (10) and there is no difficulty/per-type-count param — see
// the PR's parameter-surface report for the future-backend list. Reused for every game
// card AND the mix hero (gameType = null → the ramped mix). No API contract changes.
const GameOptionsSheet = ({ open, gameType, onClose }) => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const isPremium = useHasUnlimitedAccess();
  const [origins, setOrigins] = useState([]);
  const [selected, setSelected] = useState(FREE_ORIGIN);

  useEffect(() => {
    if (!open) return;
    // Best-effort: the world picker just falls back to the free world if this fails.
    api.get('/public/origins').then((res) => setOrigins(res.data.origins || [])).catch(() => {});
  }, [open]);

  // Each time the sheet opens (for any card), default back to the free world.
  useEffect(() => { if (open) setSelected(FREE_ORIGIN); }, [open, gameType]);

  const start = () => {
    const params = new URLSearchParams();
    if (gameType) params.set('loja', gameType);
    if (selected && selected !== FREE_ORIGIN) params.set('origjina', selected);
    const qs = params.toString();
    navigate(`/kuizi${qs ? `?${qs}` : ''}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-4 pb-4 sm:items-center sm:pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-3xl border-2 border-line bg-paper p-6 shadow-card-hover"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-ink">{t('TODO_SQ_hub_choose_world')}</h3>
              <button onClick={onClose} aria-label={t('common.close')} className="text-ink-soft transition hover:text-ink">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2">
              {origins.map((o) => {
                const free = o.code === FREE_ORIGIN;
                const locked = !free && !isPremium;
                const active = selected === o.code;
                return (
                  <button
                    key={o.code}
                    onClick={() => (locked ? navigate('/premium') : setSelected(o.code))}
                    aria-pressed={active}
                    className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-3 py-3 text-left text-sm font-black transition ${
                      active
                        ? 'border-brand-green bg-brand-green/10 text-brand-green-dark'
                        : 'border-line bg-paper text-ink hover:border-brand-green/40'
                    }`}
                  >
                    <span className="truncate">{o.name_sq}</span>
                    {locked ? (
                      <Lock className="h-4 w-4 flex-shrink-0 text-accent-purple" aria-hidden="true" />
                    ) : active ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-brand-green" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <Button variant="primary" size="lg" fullWidth onClick={start}>
              {t('TODO_SQ_hub_start')}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameOptionsSheet;
