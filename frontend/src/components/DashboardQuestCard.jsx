import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import Parrot from './mascot/Parrot.jsx';
import { t } from '../i18n/index.js';

const SPRING = { type: 'spring', stiffness: 300, damping: 22 };

// Sfida e ditës — the daily quest, shown on the dashboard. Progress bar + claim.
const DashboardQuestCard = () => {
  const { loadUser } = useAuth();
  const [quest, setQuest] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [claiming, setClaiming] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/quests/today')
      .then((res) => {
        if (!active) return;
        setQuest(res.data.quest);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, []);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await api.post('/quests/today/claim');
      setQuest((q) => ({ ...q, claimed: true }));
      if (res.data.claimed) {
        setCelebrate(true);
        loadUser();
      }
    } catch {
      // Leave the card as-is; the user can retry.
    } finally {
      setClaiming(false);
    }
  };

  if (status === 'loading' || status === 'error' || !quest) {
    // Keep the dashboard clean if the quest can't load.
    return null;
  }

  const pct = quest.target > 0 ? Math.min((quest.progress / quest.target) * 100, 100) : 0;

  return (
    <Card padding="md">
      <div className="flex items-center gap-3 mb-3">
        {celebrate ? (
          <Parrot state="celebrate-big" size={56} />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-purple/15">
            <Target className="h-6 w-6 text-accent-purple" />
          </span>
        )}
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">{t('questCard.label')}</p>
          <p className="text-base font-extrabold text-ink">{quest.title}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="h-3 flex-1 rounded-pill bg-line overflow-hidden">
          <motion.div
            className="h-full rounded-pill bg-brand-green"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={SPRING}
          />
        </div>
        <span className="text-sm font-black text-ink whitespace-nowrap">
          {Math.min(quest.progress, quest.target)}/{quest.target}
        </span>
      </div>

      {quest.claimed ? (
        <p className="text-sm font-bold text-brand-green">{t('questCard.claimed', { xp: quest.xp_reward })}</p>
      ) : (
        <Button
          variant="primary"
          size="md"
          fullWidth
          disabled={!quest.completed}
          loading={claiming}
          onClick={handleClaim}
        >
          {quest.completed ? t('questCard.claim', { xp: quest.xp_reward }) : t('questCard.continueLessons')}
        </Button>
      )}
    </Card>
  );
};

export default DashboardQuestCard;
