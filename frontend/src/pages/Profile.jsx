import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Save, Check, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Heading from '../components/ui/Heading.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';

const inputClass = 'w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 font-bold text-ink focus:outline-none focus:border-brand-green';

const Profile = () => {
  const reduceMotion = useReducedMotion();
  const { user, loading: authLoading, isLoggedIn, loadUser, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const isPremium = user?.entitlement?.tier === 'premium';

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteWord, setFavoriteWord] = useState('');
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) navigate('/hyr');
  }, [authLoading, isLoggedIn, navigate]);

  useEffect(() => {
    if (!user) return;
    setUsername(user.profile.username || '');
    setBio(user.profile.bio || '');
    setFavoriteWord(user.profile.favorite_word || '');
    setLeaderboardOptOut(Boolean(user.profile.leaderboard_opt_out));
    setSelectedAvatar(user.profile.avatar_filename || 'default.png');
  }, [user]);

  useEffect(() => {
    api.get('/avatars').then((res) => setAvatars(res.data.avatars || [])).catch(() => {});
  }, []);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const saveProfile = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await api.put('/profile', {
        username,
        bio,
        favorite_word: favoriteWord,
        leaderboard_opt_out: leaderboardOptOut,
      });
      updateUserProfile(res.data?.profile);
      flash('Profili u përditësua!');
      loadUser();
    } catch (err) {
      setError(err.response?.status === 409 ? err.response.data.message : (err.response?.data?.message || 'Gabim gjatë ruajtjes.'));
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
    return <div className="min-h-[50vh] flex items-center justify-center"><Parrot state="idle" size={120} /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="text-center mb-8"
      >
        <Avatar filename={selectedAvatar} size={80} className="mx-auto mb-4 ring-4 ring-brand-green/20" />
        <Heading level={2}>Ndrysho Profilin</Heading>
      </motion.div>

      <ErrorMessage message={error} />
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="mb-4 flex items-center gap-2 rounded-2xl border-2 border-brand-green/20 bg-brand-green/10 px-5 py-4 font-semibold text-brand-green"
        >
          <Check className="w-4 h-4" aria-hidden="true" /> {success}
        </motion.div>
      )}

      {/* Avatar selector */}
      <Card padding="md" className="mb-6">
        <Heading level={3} className="mb-4">Zgjidh Avatarin</Heading>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
          {avatars.map((filename) => {
            const active = selectedAvatar === filename;
            return (
              <button
                key={filename}
                type="button"
                onClick={() => saveAvatar(filename)}
                aria-label={`Zgjidh avatarin ${filename.replace('.png', '')}`}
                aria-pressed={active}
                className={`relative rounded-xl p-1 border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green ${
                  active ? 'border-brand-green bg-brand-green/10' : 'border-transparent hover:border-line'
                }`}
              >
                <Avatar filename={filename} size={40} className="mx-auto" />
                {active && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-green flex items-center justify-center">
                    <Check className="w-3 h-3 text-paper" aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Profile fields */}
      <Card padding="md" className="mb-6">
        <div className="space-y-5">
          <div>
            <label htmlFor="pf-username" className="block text-xs font-bold text-ink-soft mb-1">Emri i përdoruesit</label>
            <input id="pf-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} minLength={3} maxLength={30} pattern="[A-Za-z0-9_-]+" />
          </div>
          <div>
            <label htmlFor="pf-bio" className="block text-xs font-bold text-ink-soft mb-1">Biografia</label>
            <textarea id="pf-bio" value={bio} onChange={(e) => setBio(e.target.value)} className={`${inputClass} h-auto resize-none`} rows={3} maxLength={500} placeholder="Shkruaj diçka për veten…" />
          </div>
          <div>
            <label htmlFor="pf-fav" className="block text-xs font-bold text-ink-soft mb-1">Fjala ime e preferuar</label>
            <input id="pf-fav" type="text" value={favoriteWord} onChange={(e) => setFavoriteWord(e.target.value)} className={inputClass} maxLength={255} placeholder="p.sh. shqiponjë" />
          </div>
          <label className="flex items-start gap-3 text-sm font-semibold text-ink-soft">
            <input type="checkbox" checked={leaderboardOptOut} onChange={(e) => setLeaderboardOptOut(e.target.checked)} className="mt-1" />
            Mos më shfaq në renditjen publike botërore.
          </label>

          <Button variant="primary" size="lg" fullWidth loading={saving} onClick={saveProfile}>
            <Save className="w-4 h-4" aria-hidden="true" /> Ruaj Ndryshimet
          </Button>
        </div>
      </Card>

      {/* Friends live on their own page (Premium) */}
      {isPremium && (
        <Card padding="md" className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/15">
            <Users className="h-6 w-6 text-brand-green" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="font-extrabold text-ink">Miqtë</p>
            <p className="text-sm font-semibold text-ink-soft">Shto, prano dhe menaxho miqtë e tu.</p>
          </div>
          <Link to="/miqte">
            <Button variant="secondary" size="md">Shiko</Button>
          </Link>
        </Card>
      )}
    </div>
  );
};

export default Profile;
