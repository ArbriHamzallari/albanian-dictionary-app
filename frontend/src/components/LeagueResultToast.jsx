import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../utils/api.js';
import Button from './ui/Button.jsx';
import Parrot from './mascot/Parrot.jsx';
import { tierName } from '../constants/leagues.js';

// "Last week's result" toast, shown once after the season rolls over.
const LeagueResultToast = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/leagues/last-result')
      .then((res) => {
        if (active && res.data.result) {
          setResult(res.data);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!result) return null;

  const blocked = result.result === 'promotion_blocked';
  let parrot = 'idle';
  let title = `Mbete në ${tierName(result.tier)}`;
  if (result.result === 'promoted') {
    parrot = 'celebrate-big';
    title = `U ngrite në ${tierName(result.tier)}!`;
  } else if (result.result === 'demoted') {
    parrot = 'think';
    title = 'Le të kthehemi më të fortë';
  } else if (blocked) {
    parrot = 'celebrate-big';
    title = 'Fitove ngjitjen në Ari!';
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl border border-line bg-paper p-6 text-center"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Mbyll"
              className="absolute right-3 top-3 rounded-xl p-1 hover:bg-cloud"
            >
              <X className="h-5 w-5 text-ink-soft" />
            </button>

            <div className="flex justify-center">
              <Parrot state={parrot} size={150} />
            </div>
            <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
              Java e kaluar
            </p>
            <h3 className="mt-1 text-2xl font-black text-ink">{title}</h3>

            {blocked && (
              <p className="mt-2 text-sm font-semibold text-ink-soft">
                Kalo në Premium për ta zhbllokuar Arin.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3">
              {blocked && (
                <Button variant="primary" size="md" fullWidth onClick={() => navigate('/premium')}>
                  Kalo në Premium
                </Button>
              )}
              <Button
                variant={blocked ? 'secondary' : 'primary'}
                size="md"
                fullWidth
                onClick={() => { setOpen(false); navigate('/liga'); }}
              >
                Shiko ligën
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LeagueResultToast;
