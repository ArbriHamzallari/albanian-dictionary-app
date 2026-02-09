import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Flame, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import api from '../utils/api.js';

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leaderboard')
      .then((res) => setLeaderboard(res.data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <LoadingSpinner />
      </div>
    );
  }

  const currentUuid = user?.profile?.uuid;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Trophy className="w-12 h-12 mx-auto mb-3 text-fjalingo-yellow" />
        <h2 className="text-3xl font-black text-heading dark:text-dark-text">Renditja</h2>
        <p className="text-muted dark:text-dark-muted font-semibold mt-1">Top 10 lojtarët</p>
      </motion.div>

      <div className="space-y-3">
        {leaderboard.map((entry, i) => {
          const isMe = !entry.isDummy && currentUuid && entry.uuid === currentUuid;
          const rankDisplay = entry.rank;

          let rankBadge = null;
          if (rankDisplay === 1) rankBadge = <span className="text-2xl">🥇</span>;
          else if (rankDisplay === 2) rankBadge = <span className="text-2xl">🥈</span>;
          else if (rankDisplay === 3) rankBadge = <span className="text-2xl">🥉</span>;

          return (
            <motion.div
              key={entry.uuid || `dummy-${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`card flex items-center gap-4 py-4 px-5 ${
                isMe ? 'border-fjalingo-green/40 bg-fjalingo-green/5' : ''
              } ${entry.isDummy ? 'opacity-70' : ''}`}
            >
              {/* Rank */}
              <div className="w-10 text-center flex-shrink-0">
                {rankBadge || (
                  <span className="text-lg font-black text-muted dark:text-dark-muted">
                    {rankDisplay}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <Avatar filename={entry.avatar_filename} size={40} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                {entry.isDummy ? (
                  <p className={`font-bold text-heading dark:text-dark-text truncate ${isMe ? 'text-fjalingo-green' : ''}`}>
                    {entry.username}
                    {isMe && <span className="text-xs ml-1 text-fjalingo-green">(ti)</span>}
                  </p>
                ) : (
                  <Link
                    to={`/profili/${encodeURIComponent(entry.uuid)}`}
                    className={`font-bold text-heading dark:text-dark-text truncate hover:text-fjalingo-green ${isMe ? 'text-fjalingo-green' : ''}`}
                  >
                    {entry.username}
                    {isMe && <span className="text-xs ml-1 text-fjalingo-green">(ti)</span>}
                  </Link>
                )}
                <p className="text-xs font-semibold text-muted dark:text-dark-muted">
                  Niveli {entry.level}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="flex items-center gap-1 text-sm font-bold text-fjalingo-yellow">
                  <Star className="w-4 h-4 fill-fjalingo-yellow text-fjalingo-yellow" />
                  {entry.xp}
                </span>
                <span className="flex items-center gap-1 text-sm font-bold text-fjalingo-orange">
                  <Flame className="w-4 h-4" />
                  {entry.streak}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
