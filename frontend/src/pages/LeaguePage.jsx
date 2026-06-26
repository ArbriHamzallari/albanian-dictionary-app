import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../utils/api.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Heading from '../components/ui/Heading.jsx';
import Avatar from '../components/Avatar.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import { TIER_STYLE, tierName } from '../constants/leagues.js';
import { t } from '../i18n/index.js';

const SPRING = { type: 'spring', stiffness: 300, damping: 18 };

function useCountdown(endsAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!endsAt) return '';
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return t('league.ended');
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return t('league.countdownDH', { d, h });
  if (h > 0) return t('league.countdownHM', { h, m });
  return t('league.countdownM', { m });
}

const LeaguePage = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let active = true;
    api.get('/leagues/me')
      .then((res) => { if (active) { setData(res.data); setStatus('ready'); } })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, []);

  const countdown = useCountdown(data?.season?.ends_at);

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Parrot state="idle" size={120} />
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <Parrot state="think" size={120} />
        <p className="mt-4 text-ink-soft font-semibold">{t('league.loadError')}</p>
      </div>
    );
  }

  const style = TIER_STYLE[data.tier] || TIER_STYLE.bronxhi;
  const inTop5 = data.rank && data.rank <= 5;
  const parrotState = inTop5 ? 'cheer' : 'idle';

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="text-center mb-6">
        <Heading level={1}>{t('league.title')}</Heading>
      </div>

      {/* Tier header */}
      <Card padding="lg" className="text-center mb-6">
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={reduceMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={SPRING}
            className={`flex h-24 w-24 items-center justify-center rounded-full text-5xl ${style.bg} ring-4 ${style.ring}`}
          >
            {style.medal}
          </motion.div>
          <Heading level={2} className={style.text}>{tierName(data.tier)}</Heading>
          <p className="text-sm font-bold text-ink-soft">{t('league.endsIn', { countdown })}</p>
        </div>

        <div className="mt-4 flex justify-center">
          <Parrot state={parrotState} size={96} />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-black text-ink">{data.weekly_xp}</p>
            <p className="text-xs font-bold text-ink-soft">{t('league.weeklyXp')}</p>
          </div>
          <div>
            <p className="text-2xl font-black text-ink">{data.rank ? `#${data.rank}` : '—'}</p>
            <p className="text-xs font-bold text-ink-soft">{t('league.yourRank')}</p>
          </div>
        </div>
      </Card>

      {data.opted_out && (
        <Card padding="md" className="mb-6">
          <p className="text-sm font-semibold text-ink-soft">
            {t('league.optedOut')}
          </p>
        </Card>
      )}

      {!data.is_premium && data.tier === 'argjendi' && (
        <Card padding="md" className="mb-6 text-center">
          <p className="text-sm font-bold text-ink mb-3">{t('league.goldPremium')}</p>
          <Button variant="primary" size="md" onClick={() => navigate('/premium')}>
            {t('practiceCard.goPremium')}
          </Button>
        </Card>
      )}

      {/* Top 10 of my tier (pseudonymous) */}
      <p className="text-xs font-bold text-ink-soft mb-3">
        {t('league.topLabel', { segment: data.segment === 'kids' ? t('leaderboard.segmentKids') : t('leaderboard.segmentAdults') })}
      </p>
      <div className="space-y-3">
        {data.top.map((entry, i) => {
          const isMe = entry.isCurrentUser;
          let medal = null;
          if (entry.rank === 1) medal = '🥇';
          else if (entry.rank === 2) medal = '🥈';
          else if (entry.rank === 3) medal = '🥉';
          return (
            <motion.div
              key={`${entry.username}-${entry.rank}-${i}`}
              initial={reduceMotion ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduceMotion ? 0 : i * 0.04 }}
            >
              <Card
                padding="sm"
                className={`flex items-center gap-4 ${isMe ? 'ring-2 ring-brand-green bg-brand-green/5' : ''}`}
              >
                <div className="w-8 text-center flex-shrink-0">
                  {medal || <span className="text-lg font-black text-ink-soft">{entry.rank}</span>}
                </div>
                <Avatar filename={entry.avatar_filename} size={40} />
                <p className={`flex-1 min-w-0 truncate font-bold ${isMe ? 'text-brand-green' : 'text-ink'}`}>
                  {entry.username}
                  {isMe && <span className="text-xs ml-1 text-brand-green">{t('leaderboard.you')}</span>}
                </p>
                <span className="text-sm font-black text-ink whitespace-nowrap">{entry.weekly_xp} XP</span>
              </Card>
            </motion.div>
          );
        })}
        {data.top.length === 0 && (
          <Card padding="md" className="text-center">
            <p className="text-sm font-semibold text-ink-soft">
              {t('league.empty')}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LeaguePage;
