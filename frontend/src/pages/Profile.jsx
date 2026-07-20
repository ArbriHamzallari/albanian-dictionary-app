import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Save, Check, Users, Trash2, Trophy, ChevronRight } from 'lucide-react';
import { useAuth, useHasUnlimitedAccess } from '../context/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Heading from '../components/ui/Heading.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';
import { t } from '../i18n/index.js';

const inputClass = 'w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 font-bold text-ink focus:outline-none focus:border-brand-green';

// Profili is IDENTITY only (UI-3): avatar, username, badges, and identity-adjacent
// links (achievements, the single social entry). The daily loop / discovery cards that
// used to pile up here now live on Rruga (the roadmap); Propozo + Premium stay reachable
// via the footer. Nothing is orphaned — see the PR's IA table.
const Profile = () => {
  const reduceMotion = useReducedMotion();
  const { user, loading: authLoading, isLoggedIn, loadUser, updateUserProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const isPremium = useHasUnlimitedAccess();
  const isGoogleAccount = user?.profile?.auth_provider === 'google';

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteWord, setFavoriteWord] = useState('');
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  // Typed confirmation must match the user's own username before deletion is
  // allowed — language-neutral, so no Albanian confirmation word is invented here.
  const confirmWord = user?.profile?.username || '';
  const confirmMatches = confirmWord.length > 0 && deleteConfirm.trim() === confirmWord;

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
      flash(t('profile.savedProfile'));
      loadUser();
    } catch (err) {
      setError(err.response?.status === 409 ? err.response.data.message : (err.response?.data?.message || t('profile.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const saveAvatar = async (filename) => {
    setSelectedAvatar(filename);
    try {
      const res = await api.put('/profile/avatar', { filename });
      updateUserProfile(res.data?.profile);
      flash(t('profile.savedAvatar'));
      loadUser();
    } catch (err) {
      setError(err.response?.data?.message || t('profile.avatarError'));
    }
  };

  const closeDelete = () => {
    if (deleting) return;
    setShowDelete(false);
    setDeleteConfirm('');
    setDeletePassword('');
    setDeleteError('');
  };

  // Shared destroy path for both account types. On success the AuthContext has
  // already cleared local state, so we hard-redirect home.
  const runDelete = async (credentials) => {
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteAccount(credentials);
      navigate('/');
    } catch (err) {
      setDeleteError(
        err.response?.status === 401
          ? t('profile.deleteAccount.identityFailed')
          : (err.response?.data?.message || t('profile.deleteAccount.error')),
      );
      setDeleting(false);
    }
  };

  const handlePasswordDelete = () => {
    if (!confirmMatches) {
      setDeleteError(t('profile.deleteAccount.confirmMismatch'));
      return;
    }
    runDelete({ password: deletePassword });
  };

  const handleGoogleDelete = (credential) => {
    if (!confirmMatches) {
      setDeleteError(t('profile.deleteAccount.confirmMismatch'));
      return;
    }
    runDelete({ credential });
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
        <Heading level={2}>{user.profile.username || t('profile.title')}</Heading>
        {/* Identity badges: level, rank, tier */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="badge badge-green">{t('dashboard.level', { level: user.stats?.level || 1 })}</span>
          {user.rank && <span className="badge badge-blue">#{user.rank}</span>}
          <span className={isPremium ? 'badge badge-yellow' : 'badge badge-blue'}>
            {isPremium ? t('dashboard.premiumBadge') : t('dashboard.freeBadge')}
          </span>
        </div>
      </motion.div>

      {/* Identity-adjacent links: achievements (your badges) + the single social entry */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to="/arritjet" className="card card-hover flex items-center gap-3 py-4">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green/10">
            <Trophy className="h-5 w-5 text-brand-green" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-black text-heading dark:text-dark-text">
            {t('nav.achievements')}
          </span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted dark:text-dark-muted" aria-hidden="true" />
        </Link>
        <Link to="/miqte" className="card card-hover flex items-center gap-3 py-4">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green/10">
            <Users className="h-5 w-5 text-brand-green" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-black text-heading dark:text-dark-text">
            {t('nav.friends')}
          </span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted dark:text-dark-muted" aria-hidden="true" />
        </Link>
      </div>

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
        <Heading level={3} className="mb-4">{t('profile.chooseAvatar')}</Heading>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
          {avatars.map((filename) => {
            const active = selectedAvatar === filename;
            return (
              <button
                key={filename}
                type="button"
                onClick={() => saveAvatar(filename)}
                aria-label={t('profile.chooseAvatarAria', { name: filename.replace('.png', '') })}
                aria-pressed={active}
                className={`relative rounded-xl p-1 border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green ${
                  active ? 'border-brand-green bg-brand-green/10' : 'border-transparent hover:border-line'
                }`}
              >
                <Avatar filename={filename} size={40} className="mx-auto" />
                {active && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-green flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" aria-hidden="true" />
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
            <label htmlFor="pf-username" className="block text-xs font-bold text-ink-soft mb-1">{t('profile.usernameLabel')}</label>
            <input id="pf-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} minLength={3} maxLength={30} pattern="[A-Za-z0-9_-]+" />
          </div>
          <div>
            <label htmlFor="pf-bio" className="block text-xs font-bold text-ink-soft mb-1">{t('profile.bioLabel')}</label>
            <textarea id="pf-bio" value={bio} onChange={(e) => setBio(e.target.value)} className={`${inputClass} h-auto resize-none`} rows={3} maxLength={500} placeholder={t('profile.bioPlaceholder')} />
          </div>
          <div>
            <label htmlFor="pf-fav" className="block text-xs font-bold text-ink-soft mb-1">{t('profile.favoriteLabel')}</label>
            <input id="pf-fav" type="text" value={favoriteWord} onChange={(e) => setFavoriteWord(e.target.value)} className={inputClass} maxLength={255} placeholder={t('profile.favoritePlaceholder')} />
          </div>
          <label className="flex items-start gap-3 text-sm font-semibold text-ink-soft">
            <input type="checkbox" checked={leaderboardOptOut} onChange={(e) => setLeaderboardOptOut(e.target.checked)} className="mt-1" />
            {t('profile.optOutLabel')}
          </label>

          <Button variant="primary" size="lg" fullWidth loading={saving} onClick={saveProfile}>
            <Save className="w-4 h-4" aria-hidden="true" /> {t('profile.save')}
          </Button>
        </div>
      </Card>

      {/* Danger zone — self-service account deletion (GDPR erasure) */}
      <Card padding="md" className="mt-6 border-2 border-accent-coral/30">
        <Heading level={3} className="mb-2">{t('profile.deleteAccount.title')}</Heading>
        <p className="mb-4 text-sm font-semibold text-ink-soft">{t('profile.deleteAccount.description')}</p>
        {isPremium && (
          <p className="mb-4 rounded-2xl border-2 border-accent-yellow/40 bg-accent-yellow/10 px-4 py-3 text-sm font-semibold text-ink-soft">
            {t('profile.deleteAccount.premiumNotice')}{' '}
            <Link to="/premium" className="font-extrabold underline">{t('profile.deleteAccount.premiumCancelCta')}</Link>
          </p>
        )}
        <Button variant="danger" size="md" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-4 w-4" aria-hidden="true" /> {t('profile.deleteAccount.button')}
        </Button>
      </Card>

      <ConfirmDialog
        open={showDelete}
        title={t('profile.deleteAccount.dialogTitle')}
        description={t('profile.deleteAccount.dialogDescription')}
        confirmLabel={t('profile.deleteAccount.confirm')}
        variant="danger"
        loading={deleting}
        hideConfirm={isGoogleAccount}
        onCancel={closeDelete}
        onConfirm={handlePasswordDelete}
      >
        <div className="mt-4 space-y-4">
          {deleteError && <ErrorMessage message={deleteError} />}
          <div>
            <label htmlFor="del-confirm" className="mb-1 block text-xs font-bold text-ink-soft">
              {t('profile.deleteAccount.typeToConfirm', { word: confirmWord })}
            </label>
            <input
              id="del-confirm"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className={inputClass}
              autoComplete="off"
            />
          </div>
          {isGoogleAccount ? (
            <div>
              <p className="mb-2 text-xs font-bold text-ink-soft">{t('profile.deleteAccount.googleReauth')}</p>
              {confirmMatches && !deleting && <GoogleSignInButton onCredential={handleGoogleDelete} />}
            </div>
          ) : (
            <div>
              <label htmlFor="del-pass" className="mb-1 block text-xs font-bold text-ink-soft">
                {t('profile.deleteAccount.passwordLabel')}
              </label>
              <input
                id="del-pass"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
              />
            </div>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
};

export default Profile;
