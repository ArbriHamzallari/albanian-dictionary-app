import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Flame, Trophy, UserPlus, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';

const PublicProfile = () => {
  const { uuid } = useParams();
  const { user, isLoggedIn } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [friendStatus, setFriendStatus] = useState('none'); // none | outgoing | incoming | friends | self
  const [incomingRequestId, setIncomingRequestId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isSelf = useMemo(() => {
    if (!profileData?.profile || !user?.profile) return false;
    return profileData.profile.uuid === user.profile.uuid;
  }, [profileData, user]);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError('');
    api.get(`/profile/${encodeURIComponent(uuid)}`)
      .then((res) => {
        if (!isActive) return;
        setProfileData(res.data);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err.response?.data?.message || 'Profili nuk u gjet.');
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [uuid]);

  useEffect(() => {
    const loadStatus = async () => {
      if (!isLoggedIn || !profileData?.profile || isSelf) {
        setFriendStatus(isSelf ? 'self' : 'none');
        setIncomingRequestId(null);
        return;
      }
      try {
        const [friendsRes, requestsRes] = await Promise.all([
          api.get('/friends'),
          api.get('/friends/requests'),
        ]);
        const targetUuid = profileData.profile.uuid;
        const friends = friendsRes.data?.friends || [];
        const incoming = requestsRes.data?.incoming || [];
        const outgoing = requestsRes.data?.outgoing || [];

        if (friends.some((f) => f.uuid === targetUuid)) {
          setFriendStatus('friends');
          setIncomingRequestId(null);
          return;
        }
        const incomingReq = incoming.find((r) => r.uuid === targetUuid);
        if (incomingReq) {
          setFriendStatus('incoming');
          setIncomingRequestId(incomingReq.id);
          return;
        }
        if (outgoing.some((r) => r.uuid === targetUuid)) {
          setFriendStatus('outgoing');
          setIncomingRequestId(null);
          return;
        }
        setFriendStatus('none');
        setIncomingRequestId(null);
      } catch {
        setFriendStatus('none');
        setIncomingRequestId(null);
      }
    };
    loadStatus();
  }, [profileData, isLoggedIn, isSelf]);

  const sendRequest = async () => {
    if (!profileData?.profile) return;
    setActionLoading(true);
    try {
      await api.post('/friends/request', { recipient_username: profileData.profile.username });
      setFriendStatus('outgoing');
    } catch {
      // ignore for now
    } finally {
      setActionLoading(false);
    }
  };

  const acceptRequest = async () => {
    if (!incomingRequestId) return;
    setActionLoading(true);
    try {
      await api.post('/friends/accept', { request_id: incomingRequestId });
      setFriendStatus('friends');
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const declineRequest = async () => {
    if (!incomingRequestId) return;
    setActionLoading(true);
    try {
      await api.post('/friends/decline', { request_id: incomingRequestId });
      setFriendStatus('none');
      setIncomingRequestId(null);
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const removeFriend = async () => {
    if (!profileData?.profile) return;
    setActionLoading(true);
    try {
      await api.post('/friends/remove', { target_username: profileData.profile.username });
      setFriendStatus('none');
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const cancelRequest = async () => {
    if (!profileData?.profile) return;
    setActionLoading(true);
    try {
      const requestsRes = await api.get('/friends/requests');
      const outgoing = requestsRes.data?.outgoing || [];
      const request = outgoing.find((r) => r.uuid === profileData.profile.uuid);
      if (request) {
        await api.post('/friends/cancel', { request_id: request.id });
      }
      setFriendStatus('none');
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !profileData?.profile) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <ErrorMessage message={error || 'Profili nuk u gjet.'} />
      </div>
    );
  }

  const { profile, stats, rank } = profileData;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Avatar filename={profile.avatar_filename} size={90} className="mx-auto mb-4 ring-4 ring-fjalingo-green/20" />
        <h2 className="text-2xl font-black text-heading dark:text-dark-text">{profile.username}</h2>
        <div className="flex items-center justify-center gap-2 mt-2 text-sm font-semibold text-muted dark:text-dark-muted">
          <Trophy className="w-4 h-4" />
          {rank ? `Renditja #${rank}` : 'Pa renditje'}
        </div>

        {isSelf && (
          <div className="mt-4">
            <Link to="/profili" className="btn-outline inline-flex items-center gap-2">
              Ndrysho Profilin
            </Link>
          </div>
        )}

        {!isSelf && isLoggedIn && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {friendStatus === 'friends' && (
              <>
                <span className="badge badge-green inline-flex items-center gap-1">
                  <Check className="w-4 h-4" /> Jeni miq
                </span>
                <button
                  onClick={removeFriend}
                  disabled={actionLoading}
                  className="btn-outline inline-flex items-center gap-2"
                >
                  Hiq miqësinë
                </button>
              </>
            )}
            {friendStatus === 'outgoing' && (
              <>
                <span className="badge badge-blue">Kërkesa u dërgua</span>
                <button
                  onClick={cancelRequest}
                  disabled={actionLoading}
                  className="btn-outline inline-flex items-center gap-2"
                >
                  Anulo kërkesën
                </button>
              </>
            )}
            {friendStatus === 'none' && (
              <button
                onClick={sendRequest}
                disabled={actionLoading}
                className="btn-primary inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Shto mik
              </button>
            )}
            {friendStatus === 'incoming' && (
              <>
                <button
                  onClick={acceptRequest}
                  disabled={actionLoading}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Prano
                </button>
                <button
                  onClick={declineRequest}
                  disabled={actionLoading}
                  className="btn-outline inline-flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Refuzo
                </button>
              </>
            )}
          </div>
        )}

        {!isSelf && !isLoggedIn && (
          <div className="mt-4 flex items-center justify-center">
            <Link to="/hyr" className="btn-primary inline-flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Hyr për të shtuar mik
            </Link>
          </div>
        )}
      </motion.div>

      <div className="card mb-6 space-y-4">
        <div>
          <p className="text-xs font-bold text-muted dark:text-dark-muted mb-1">Biografia</p>
          <p className="font-semibold text-heading dark:text-dark-text">
            {profile.bio || 'Nuk ka bio ende.'}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-muted dark:text-dark-muted mb-1">Fjala e preferuar</p>
          <p className="font-semibold text-heading dark:text-dark-text">
            {profile.favorite_word || 'Nuk ka fjalë të preferuar.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-5">
          <Star className="w-6 h-6 mx-auto mb-2 text-fjalingo-yellow fill-fjalingo-yellow" />
          <p className="text-2xl font-black text-heading dark:text-dark-text">{stats?.xp ?? 0}</p>
          <p className="text-xs font-bold text-muted dark:text-dark-muted">XP</p>
        </div>
        <div className="card text-center py-5">
          <Flame className="w-6 h-6 mx-auto mb-2 text-fjalingo-orange" />
          <p className="text-2xl font-black text-heading dark:text-dark-text">{stats?.streak ?? 0}</p>
          <p className="text-xs font-bold text-muted dark:text-dark-muted">Seria</p>
        </div>
        <div className="card text-center py-5">
          <Trophy className="w-6 h-6 mx-auto mb-2 text-fjalingo-green" />
          <p className="text-2xl font-black text-heading dark:text-dark-text">{stats?.level ?? 1}</p>
          <p className="text-xs font-bold text-muted dark:text-dark-muted">Niveli</p>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
