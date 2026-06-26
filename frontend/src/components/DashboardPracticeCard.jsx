import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { RotateCcw, Lock } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import { t } from '../i18n/index.js';

const SPRING = { type: 'spring', stiffness: 300, damping: 22 };

// "Përsërit gabimet" dashboard card. Premium users tap in; free users see the
// same card greyed with a Premium tag and a CTA — visible-but-locked, no nag bar.
const DashboardPracticeCard = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const isPremium = user?.entitlement?.tier === 'premium';
  const [count, setCount] = useState(null);

  useEffect(() => {
    let active = true;
    api.get('/lessons/practice-mistakes/count')
      .then((res) => { if (active) setCount(res.data.count ?? 0); })
      .catch(() => { if (active) setCount(0); });
    return () => { active = false; };
  }, []);

  const countText = count == null
    ? t('practiceCard.counting')
    : t('practiceCard.wordsToReview', { count });

  const enter = () => {
    if (isPremium) navigate('/perserit-gabimet');
  };

  return (
    <Card
      padding="md"
      className={isPremium ? '' : 'opacity-60'}
      onClick={isPremium ? enter : undefined}
      role={isPremium ? 'button' : undefined}
      tabIndex={isPremium ? 0 : undefined}
      onKeyDown={isPremium ? (e) => { if (e.key === 'Enter') enter(); } : undefined}
      style={isPremium ? { cursor: 'pointer' } : undefined}
    >
      <div className="flex items-center gap-3 mb-3">
        <motion.span
          whileHover={isPremium && !reduceMotion ? { rotate: -25 } : undefined}
          transition={SPRING}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/15"
        >
          <RotateCcw className="h-6 w-6 text-brand-green" />
        </motion.span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">
              {t('practiceCard.title')}
            </p>
            {!isPremium && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-accent-purple/15 px-2 py-0.5 text-[10px] font-extrabold uppercase text-accent-purple">
                <Lock className="h-3 w-3" /> {t('nav.premium')}
              </span>
            )}
          </div>
          <p className="text-base font-extrabold text-ink truncate">{countText}</p>
        </div>
      </div>

      {isPremium ? (
        <Button variant="primary" size="md" fullWidth disabled={count === 0} onClick={enter}>
          {count === 0 ? t('practiceCard.nothingToReview') : t('practiceCard.startReview')}
        </Button>
      ) : (
        <Button variant="primary" size="md" fullWidth onClick={() => navigate('/premium')}>
          {t('practiceCard.goPremium')}
        </Button>
      )}
    </Card>
  );
};

export default DashboardPracticeCard;
