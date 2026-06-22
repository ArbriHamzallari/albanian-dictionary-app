import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Flame, Star } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import Card from '../components/ui/Card.jsx';
import Heading from '../components/ui/Heading.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import api from '../utils/api.js';

const SPRING = { type: 'spring', stiffness: 300, damping: 24 };

const Leaderboard = () => {
  const reduceMotion = useReducedMotion();
  const [leaderboard, setLeaderboard] = useState([]);
  const [viewer, setViewer] = useState({ tier: 'free', canParticipate: false });
  const [segment, setSegment] = useState('adults');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leaderboard')
      .then((res) => {
        setLeaderboard(res.data.leaderboard || []);
        setViewer(res.data.viewer || { tier: 'free', canParticipate: false });
        setSegment(res.data.segment || 'adults');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Parrot state="idle" size={120} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="text-center mb-8">
        <Trophy className="w-12 h-12 mx-auto mb-3 text-accent-yellow" aria-hidden="true" />
        <Heading level={1}>Renditja</Heading>
        <p className="text-ink-soft font-semibold mt-1">Top 10 lojtarët Premium</p>
        <p className="text-xs text-ink-soft font-semibold mt-1">
          Segmenti: {segment === 'kids' ? 'fëmijë' : 'të rritur'} · vetëm emër publik dhe avatar
        </p>
        {!viewer.canParticipate && (
          <p className="text-sm text-ink-soft font-semibold mt-3">
            Plani falas mund ta shohë renditjen, por pjesëmarrja kërkon Premium.
          </p>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="flex justify-center"><Parrot state="idle" size={130} /></div>
          <p className="mt-3 text-ink-soft font-semibold">Ende askush në renditje. Bëhu i pari!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry, i) => {
            const isMe = Boolean(entry.isCurrentUser);
            const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : null;

            return (
              <motion.div
                key={`${entry.username}-${entry.rank || i}`}
                initial={reduceMotion ? false : { opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, delay: reduceMotion ? 0 : i * 0.04 }}
              >
                <Card padding="sm" className={`flex items-center gap-4 ${isMe ? 'ring-2 ring-brand-green bg-brand-green/5' : ''}`}>
                  <div className="w-9 text-center flex-shrink-0">
                    {medal ? <span className="text-2xl">{medal}</span> : (
                      <span className="text-lg font-black text-ink-soft">{entry.rank}</span>
                    )}
                  </div>

                  <Avatar filename={entry.avatar_filename} size={40} />

                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${isMe ? 'text-brand-green' : 'text-ink'}`}>
                      {entry.username}
                      {isMe && <span className="text-xs ml-1 text-brand-green">(ti)</span>}
                    </p>
                    <p className="text-xs font-semibold text-ink-soft">Niveli {entry.level}</p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="flex items-center gap-1 text-sm font-bold text-accent-yellow">
                      <Star className="w-4 h-4" aria-hidden="true" />
                      {entry.xp}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-bold text-accent-coral">
                      <Flame className="w-4 h-4" aria-hidden="true" />
                      {entry.streak}
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
