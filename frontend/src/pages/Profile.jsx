import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';

const Profile = () => {
  const { user, loading: authLoading, isLoggedIn, loadUser, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteWord, setFavoriteWord] = useState('');
  const [avatars, setAvatars] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [friendsLoading, setFriendsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/hyr');
    }
  }, [authLoading, isLoggedIn, navigate]);

  useEffect(() => {
    if (!user) return;
    setUsername(user.profile.username || '');
    setBio(user.profile.bio || '');
    setFavoriteWord(user.profile.favorite_word || '');
    setSelectedAvatar(user.profile.avatar_filename || 'default.png');
  }, [user]);

  useEffect(() => {
    api.get('/avatars')
      .then((res) => setAvatars(res.data.avatars || []))
      .catch(() => {});
  }, []);

  const loadFriendsData = async () => {
    if (!isLoggedIn) return;
    setFriendsLoading(true);
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.get('/friends'),
        api.get('/friends/requests'),
      ]);
      setFriends(friendsRes.data?.friends || []);
      setRequests({
        incoming: requestsRes.data?.incoming || [],
        outgoing: requestsRes.data?.outgoing || [],
      });
    } catch {
      setFriends([]);
      setRequests({ incoming: [], outgoing: [] });
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadFriendsData();
  }, [user]);

  const acceptFriend = async (requestId) => {
    try {
      await api.post('/friends/accept', { request_id: requestId });
      loadFriendsData();
    } catch (err) {
      setError(err.response?.data?.message || 'Nuk u pranua kërkesa.');
    }
  };

  const declineFriend = async (requestId) => {
    try {
      await api.post('/friends/decline', { request_id: requestId });
      loadFriendsData();
    } catch (err) {
      setError(err.response?.data?.message || 'Nuk u refuzua kërkesa.');
    }
  };

  const cancelOutgoing = async (requestId) => {
    try {
      await api.post('/friends/cancel', { request_id: requestId });
      loadFriendsData();
    } catch (err) {
      setError(err.response?.data?.message || 'Nuk u anulua kërkesa.');
    }
  };

  const removeFriend = async (usernameToRemove) => {
    try {
      await api.post('/friends/remove', { target_username: usernameToRemove });
      loadFriendsData();
    } catch (err) {
      setError(err.response?.data?.message || 'Nuk u hoq miku.');
    }
  };

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const saveProfile = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await api.put('/profile', { username, bio, favorite_word: favoriteWord });
      updateUserProfile(res.data?.profile);
      flash('Profili u përditësua!');
      loadUser();
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || 'Gabim gjatë ruajtjes.');
      }
    } finally {
      setSaving(false);
    }
  };

  const saveAvatar = async (filename) => {
    setSelectedAvatar(filename);
    try {
      const res = await api.put('/profile/avatar', { filename });
      updateUserProfile(res.data?.profile);
      flash('Avatari u ndryshua!');
      loadUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Gabim gjatë ndryshimit të avatarit.');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Avatar filename={selectedAvatar} size={80} className="mx-auto mb-4 ring-4 ring-fjalingo-green/20" />
        <h2 className="text-2xl font-black text-heading dark:text-dark-text">Ndrysho Profilin</h2>
      </motion.div>

      <ErrorMessage message={error} />
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-fjalingo-green/10 border-2 border-fjalingo-green/20 text-fjalingo-green px-5 py-4 rounded-2xl font-semibold mb-4 flex items-center gap-2"
        >
          <Check className="w-4 h-4" /> {success}
        </motion.div>
      )}

      {/* Avatar selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mb-6"
      >
        <h3 className="text-sm font-black text-heading dark:text-dark-text mb-4">Zgjidh Avatarin</h3>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
          {avatars.map((filename) => (
            <button
              key={filename}
              onClick={() => saveAvatar(filename)}
              className={`relative rounded-xl p-1 transition border-2 ${
                selectedAvatar === filename
                  ? 'border-fjalingo-green bg-fjalingo-green/10'
                  : 'border-transparent hover:border-border dark:hover:border-dark-border'
              }`}
            >
              <Avatar filename={filename} size={40} className="mx-auto" />
              {selectedAvatar === filename && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-fjalingo-green flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Profile fields */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card space-y-5 mb-6"
      >
        <div>
          <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">Emri i përdoruesit</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field"
            minLength={3}
            maxLength={30}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">Biografia</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="input-field resize-none"
            rows={3}
            maxLength={500}
            placeholder="Shkruaj diçka për veten..."
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">Fjala ime e preferuar</label>
          <input
            type="text"
            value={favoriteWord}
            onChange={(e) => setFavoriteWord(e.target.value)}
            className="input-field"
            maxLength={255}
            placeholder="p.sh. shqiponjë"
          />
        </div>

        <button onClick={saveProfile} disabled={saving} className="btn-primary w-full inline-flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
        </button>
      </motion.div>

      {/* Friends & Requests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card space-y-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-heading dark:text-dark-text">Miqtë</h3>
          <span className="text-xs font-bold text-muted dark:text-dark-muted">
            {friends.length} total
          </span>
        </div>

        {friendsLoading && <LoadingSpinner />}
        {!friendsLoading && friends.length === 0 && (
          <p className="text-sm font-semibold text-muted dark:text-dark-muted">Nuk keni miq ende.</p>
        )}
        {!friendsLoading && friends.length > 0 && (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div key={friend.uuid} className="flex items-center gap-3">
                <Avatar filename={friend.avatar_filename} size={36} />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profili/${encodeURIComponent(friend.uuid)}`}
                    className="font-bold text-heading dark:text-dark-text hover:text-fjalingo-green truncate"
                  >
                    {friend.username}
                  </Link>
                  <p className="text-xs font-semibold text-muted dark:text-dark-muted">
                    XP {friend.xp ?? 0} · Niveli {friend.level ?? 1}
                  </p>
                </div>
                <button
                  onClick={() => removeFriend(friend.username)}
                  className="btn-outline text-xs px-3 py-2"
                >
                  Hiq
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border dark:border-dark-border pt-4">
          <h4 className="text-xs font-black text-heading dark:text-dark-text mb-2">Kërkesa në pritje</h4>
          {requests.incoming.length === 0 && requests.outgoing.length === 0 && (
            <p className="text-sm font-semibold text-muted dark:text-dark-muted">Nuk ka kërkesa.</p>
          )}

          {requests.incoming.length > 0 && (
            <div className="space-y-2 mb-3">
              {requests.incoming.map((req) => (
                <div key={req.id} className="flex items-center gap-3">
                  <Avatar filename={req.avatar_filename} size={32} />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profili/${encodeURIComponent(req.uuid)}`}
                      className="font-bold text-heading dark:text-dark-text hover:text-fjalingo-green truncate"
                    >
                      {req.username}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => acceptFriend(req.id)} className="btn-primary text-xs px-3 py-2">
                      Prano
                    </button>
                    <button onClick={() => declineFriend(req.id)} className="btn-outline text-xs px-3 py-2">
                      Refuzo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {requests.outgoing.length > 0 && (
            <div className="space-y-2">
              {requests.outgoing.map((req) => (
                <div key={req.id} className="flex items-center gap-3">
                  <Avatar filename={req.avatar_filename} size={32} />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profili/${encodeURIComponent(req.uuid)}`}
                      className="font-bold text-heading dark:text-dark-text hover:text-fjalingo-green truncate"
                    >
                      {req.username}
                    </Link>
                    <p className="text-xs font-semibold text-muted dark:text-dark-muted">Kërkesa u dërgua</p>
                  </div>
                  <button
                    onClick={() => cancelOutgoing(req.id)}
                    className="btn-outline text-xs px-3 py-2"
                  >
                    Anulo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
