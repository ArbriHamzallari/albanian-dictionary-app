import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Flame, Star, Ban, Flag, UserMinus, MessageCircle, Check, X } from 'lucide-react';
import api from '../utils/api.js';
import { useHasUnlimitedAccess } from '../context/AuthContext.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Heading from '../components/ui/Heading.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import Avatar from '../components/Avatar.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import { t } from '../i18n/index.js';

const TAB_KEYS = ['friends', 'incoming', 'outgoing'];

// Small icon button with an accessible label and a focus ring.
const IconButton = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="rounded-xl p-2 text-ink-soft hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
  >
    {children}
  </button>
);

const PremiumGate = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <div className="flex justify-center"><Parrot state="wave" size={150} /></div>
      <Heading level={2} className="mt-4">{t('friends.premiumGateTitle')}</Heading>
      <p className="mt-2 text-ink-soft font-semibold">
        {t('friends.premiumGateDesc')}
      </p>
      <Button variant="primary" size="lg" className="mt-6" onClick={() => navigate('/premium')}>
        {t('practiceCard.goPremium')}
      </Button>
    </div>
  );
};

const FriendsPage = () => {
  const isPremium = useHasUnlimitedAccess();

  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | locked | error
  const [searchName, setSearchName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [dialog, setDialog] = useState(null); // { type, friend }
  const [reportDetails, setReportDetails] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([api.get('/friends'), api.get('/friends/requests')]);
      setFriends(f.data.friends || []);
      setIncoming(r.data.incoming || []);
      setOutgoing(r.data.outgoing || []);
      setStatus('ready');
    } catch (err) {
      if (err?.response?.status === 402) setStatus('locked');
      else setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!isPremium) { setStatus('locked'); return; }
    load();
  }, [isPremium, load]);

  const flash = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(''), 3000); };

  const addFriend = async (e) => {
    e.preventDefault();
    const name = searchName.trim();
    if (!name) return;
    try {
      await api.post('/friends/request', { recipient_username: name });
      setSearchName('');
      flash(t('friends.requestSent'));
      load();
    } catch (err) {
      flash(err?.response?.data?.message || t('friends.requestFailed'));
    }
  };

  const respond = async (path, request_id) => {
    try {
      await api.post(`/friends/${path}`, { request_id });
      load();
    } catch (err) {
      flash(err?.response?.data?.message || t('social.actionFailed'));
    }
  };

  const runDialog = async () => {
    if (!dialog) return;
    setDialogLoading(true);
    try {
      if (dialog.type === 'block') {
        await api.post('/chat/block', { target_username: dialog.friend.username });
        flash(t('friends.userBlocked'));
      } else if (dialog.type === 'remove') {
        await api.post('/friends/remove', { target_username: dialog.friend.username });
        flash(t('friends.friendRemoved'));
      } else if (dialog.type === 'report') {
        await api.post('/chat/report', {
          reported_username: dialog.friend.username,
          reason: 'safety',
          details: reportDetails.trim() || undefined,
          surface: 'friends',
        });
        flash(t('social.reportSent'));
      }
      setDialog(null);
      setReportDetails('');
      load();
    } catch (err) {
      flash(err?.response?.data?.message || t('social.actionFailed'));
    } finally {
      setDialogLoading(false);
    }
  };

  if (status === 'locked') return <PremiumGate />;

  if (status === 'loading') {
    return <div className="min-h-[50vh] flex items-center justify-center"><Parrot state="idle" size={110} /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Heading level={1} className="mb-6">{t('nav.friends')}</Heading>

      {/* Add friend */}
      <Card padding="md" className="mb-4">
        <form onSubmit={addFriend} className="flex gap-3">
          <div className="relative flex-1">
            <label htmlFor="friend-search" className="sr-only">{t('auth.register.usernameLabel')}</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft" aria-hidden="true" />
            <input
              id="friend-search"
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder={t('friends.addPlaceholder')}
              className="w-full rounded-2xl border-2 border-line bg-paper pl-10 pr-4 h-14 font-bold text-ink focus:outline-none focus:border-brand-green"
            />
          </div>
          <Button type="submit" variant="primary" size="lg">{t('friends.add')}</Button>
        </form>
      </Card>

      {feedback && (
        <p role="status" className="mb-4 text-sm font-bold text-brand-green">{feedback}</p>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label={t('friends.tablistLabel')} className="flex gap-2 mb-5">
        {TAB_KEYS.map((key) => {
          const count = key === 'incoming' ? incoming.length : key === 'outgoing' ? outgoing.length : friends.length;
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={`rounded-pill px-4 py-2 text-sm font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green ${
                active ? 'bg-brand-green text-paper' : 'bg-paper text-ink-soft border-2 border-line'
              }`}
            >
              {t(`friends.tabs.${key}`)}{count ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Friends list */}
      {tab === 'friends' && (
        friends.length === 0 ? (
          <Card padding="lg" className="text-center">
            <div className="flex justify-center"><Parrot state="idle" size={140} /></div>
            <Heading level={3} className="mt-3">{t('friends.emptyTitle')}</Heading>
            <p className="mt-1 text-ink-soft font-semibold">{t('friends.emptyDesc')}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {friends.map((f, i) => (
              <motion.div key={f.uuid} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card padding="sm" className="flex items-center gap-3">
                  <Avatar filename={f.avatar_filename} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-ink truncate">{f.username}</p>
                    <p className="flex items-center gap-3 text-xs font-bold text-ink-soft">
                      <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-accent-yellow" />{f.xp ?? 0} XP</span>
                      <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-accent-coral" />{f.streak ?? 0}</span>
                    </p>
                  </div>
                  <Link
                    to={`/bisedat/${encodeURIComponent(f.username)}`}
                    aria-label={t('friends.chatWith', { username: f.username })}
                    className="rounded-xl p-2 text-brand-green hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </Link>
                  <IconButton label={t('friends.removeAria', { username: f.username })} onClick={() => setDialog({ type: 'remove', friend: f })}>
                    <UserMinus className="h-5 w-5" />
                  </IconButton>
                  <IconButton label={t('social.reportAria', { username: f.username })} onClick={() => setDialog({ type: 'report', friend: f })}>
                    <Flag className="h-5 w-5" />
                  </IconButton>
                  <IconButton label={t('social.blockAria', { username: f.username })} onClick={() => setDialog({ type: 'block', friend: f })}>
                    <Ban className="h-5 w-5 text-accent-coral" />
                  </IconButton>
                </Card>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* Incoming requests */}
      {tab === 'incoming' && (
        incoming.length === 0 ? (
          <Card padding="lg" className="text-center">
            <div className="flex justify-center"><Parrot state="idle" size={120} /></div>
            <p className="mt-3 text-ink-soft font-semibold">{t('friends.noIncoming')}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {incoming.map((r) => (
              <Card key={r.id} padding="sm" className="flex items-center gap-3">
                <Avatar filename={r.avatar_filename} size={44} />
                <p className="flex-1 min-w-0 font-extrabold text-ink truncate">{r.username}</p>
                <Button variant="primary" size="md" onClick={() => respond('accept', r.id)}>
                  <Check className="h-4 w-4" aria-hidden="true" /> {t('publicProfile.accept')}
                </Button>
                <IconButton label={t('friends.declineAria', { username: r.username })} onClick={() => respond('decline', r.id)}>
                  <X className="h-5 w-5" />
                </IconButton>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Outgoing requests */}
      {tab === 'outgoing' && (
        outgoing.length === 0 ? (
          <Card padding="lg" className="text-center">
            <div className="flex justify-center"><Parrot state="idle" size={120} /></div>
            <p className="mt-3 text-ink-soft font-semibold">{t('friends.noOutgoing')}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {outgoing.map((r) => (
              <Card key={r.id} padding="sm" className="flex items-center gap-3">
                <Avatar filename={r.avatar_filename} size={44} />
                <p className="flex-1 min-w-0 font-extrabold text-ink truncate">{r.username}</p>
                <Button variant="secondary" size="md" onClick={() => respond('cancel', r.id)}>{t('common.cancel')}</Button>
              </Card>
            ))}
          </div>
        )
      )}

      <ConfirmDialog
        open={!!dialog}
        title={
          dialog?.type === 'block' ? t('social.blockTitle', { username: dialog?.friend?.username })
          : dialog?.type === 'remove' ? t('friends.removeTitle', { username: dialog?.friend?.username })
          : t('social.reportTitle', { username: dialog?.friend?.username })
        }
        description={
          dialog?.type === 'block' ? t('friends.blockDesc')
          : dialog?.type === 'remove' ? t('friends.removeDesc')
          : t('social.reportDesc')
        }
        confirmLabel={dialog?.type === 'remove' ? t('friends.remove') : dialog?.type === 'block' ? t('social.block') : t('social.report')}
        loading={dialogLoading}
        onConfirm={runDialog}
        onCancel={() => { setDialog(null); setReportDetails(''); }}
      >
        {dialog?.type === 'report' && (
          <div className="mt-4">
            <label htmlFor="report-details" className="block text-xs font-bold text-ink-soft mb-1">
              {t('social.detailsLabel')}
            </label>
            <textarea
              id="report-details"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border-2 border-line bg-paper p-3 text-sm font-semibold text-ink focus:outline-none focus:border-brand-green"
              placeholder={t('social.detailsPlaceholder')}
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
};

export default FriendsPage;
