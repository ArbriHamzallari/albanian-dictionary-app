import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Smile, Send, Ban, Flag, ArrowLeft } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Heading from '../components/ui/Heading.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import Avatar from '../components/Avatar.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import { t } from '../i18n/index.js';

const EMOJI = ['😀', '😂', '😍', '👍', '🎉', '🔥', '👏', '🙌', '❤️', '😎', '🤔', '😢'];

const PremiumGate = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <div className="flex justify-center"><Parrot state="wave" size={150} /></div>
      <Heading level={2} className="mt-4">{t('chat.premiumGateTitle')}</Heading>
      <p className="mt-2 text-ink-soft font-semibold">{t('chat.premiumGateDesc')}</p>
      <Button variant="primary" size="lg" className="mt-6" onClick={() => navigate('/premium')}>{t('practiceCard.goPremium')}</Button>
    </div>
  );
};

const ChatPage = () => {
  const { username: activeUsername } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPremium = user?.entitlement?.tier === 'premium';
  // Friends are always same-segment, so a minor's threads are minor-involved.
  const allowFreeText = !user?.profile?.is_minor;

  const [friends, setFriends] = useState([]);
  const [presets, setPresets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | locked | error
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [dialog, setDialog] = useState(null); // 'block' | 'report'
  const [reportDetails, setReportDetails] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);
  const threadEndRef = useRef(null);

  const activeFriend = friends.find((f) => f.username.toLowerCase() === (activeUsername || '').toLowerCase());

  const flash = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(''), 3000); };

  const loadBase = useCallback(async () => {
    try {
      const [f, p] = await Promise.all([api.get('/friends'), api.get('/chat/presets')]);
      setFriends(f.data.friends || []);
      setPresets(p.data.phrases || []);
      setStatus('ready');
    } catch (err) {
      if (err?.response?.status === 402) setStatus('locked');
      else setStatus('error');
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!activeUsername) return;
    try {
      const res = await api.get(`/chat/with/${encodeURIComponent(activeUsername)}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      if (err?.response?.status === 402) setStatus('locked');
    }
  }, [activeUsername]);

  useEffect(() => {
    if (!isPremium) { setStatus('locked'); return; }
    loadBase();
  }, [isPremium, loadBase]);

  useEffect(() => {
    setMessages([]);
    loadMessages();
    if (!activeUsername) return undefined;
    const id = setInterval(loadMessages, 8000); // light poll for new messages
    return () => clearInterval(id);
  }, [activeUsername, loadMessages]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const send = async (message_type, body) => {
    if (!activeFriend || !body) return;
    try {
      await api.post('/chat/message', { recipient_username: activeFriend.username, message_type, body });
      if (message_type === 'text') setText('');
      setShowEmoji(false);
      loadMessages();
    } catch (err) {
      flash(err?.response?.data?.message || t('chat.sendError'));
    }
  };

  const runDialog = async () => {
    if (!dialog || !activeFriend) return;
    setDialogLoading(true);
    try {
      if (dialog === 'block') {
        await api.post('/chat/block', { target_username: activeFriend.username });
        setDialog(null);
        navigate('/bisedat');
        loadBase();
      } else {
        await api.post('/chat/report', {
          reported_username: activeFriend.username,
          reason: 'safety',
          details: reportDetails.trim() || undefined,
          surface: 'chat',
        });
        setDialog(null);
        setReportDetails('');
        flash(t('social.reportSent'));
      }
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

  const FriendList = (
    <Card padding="sm" className="h-full overflow-y-auto">
      <Heading level={3} className="px-2 py-2">{t('nav.chats')}</Heading>
      {friends.length === 0 ? (
        <div className="p-4 text-center">
          <div className="flex justify-center"><Parrot state="idle" size={110} /></div>
          <p className="mt-2 text-sm font-semibold text-ink-soft">{t('chat.noFriends')}</p>
          <Link to="/miqte" className="mt-3 inline-block text-sm font-bold text-brand-green hover:underline">{t('chat.addFriends')}</Link>
        </div>
      ) : (
        <ul className="space-y-1">
          {friends.map((f) => {
            const active = activeFriend && f.uuid === activeFriend.uuid;
            return (
              <li key={f.uuid}>
                <Link
                  to={`/bisedat/${encodeURIComponent(f.username)}`}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green ${active ? 'bg-brand-green/10' : 'hover:bg-cloud'}`}
                >
                  <Avatar filename={f.avatar_filename} size={40} />
                  <span className="font-bold text-ink truncate">{f.username}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );

  const Thread = activeFriend ? (
    <Card padding="sm" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line px-2 pb-3">
        <Link to="/bisedat" aria-label={t('chat.backToChats')} className="md:hidden rounded-xl p-2 hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green">
          <ArrowLeft className="h-5 w-5 text-ink-soft" />
        </Link>
        <Avatar filename={activeFriend.avatar_filename} size={40} />
        <p className="flex-1 font-extrabold text-ink truncate">{activeFriend.username}</p>
        <button type="button" onClick={() => setDialog('report')} aria-label={t('social.report')} title={t('social.report')} className="rounded-xl p-2 text-ink-soft hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green">
          <Flag className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => setDialog('block')} aria-label={t('social.block')} title={t('social.block')} className="rounded-xl p-2 text-accent-coral hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green">
          <Ban className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-2" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-center text-sm font-semibold text-ink-soft py-8">{t('chat.sayHello')}</p>
        ) : messages.map((m) => (
          <div key={m.id} className={`flex ${m.direction === 'sent' ? 'justify-end' : 'justify-start'}`}>
            <span className={`max-w-[75%] rounded-2xl px-4 py-2 text-base font-semibold ${m.direction === 'sent' ? 'bg-brand-green text-paper' : 'bg-cloud text-ink'}`}>
              {m.body}
            </span>
          </div>
        ))}
        <div ref={threadEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-line pt-3">
        {/* Preset phrases */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {presets.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => send('preset', phrase)}
              className="whitespace-nowrap rounded-pill border-2 border-line bg-paper px-3 py-1.5 text-sm font-bold text-ink hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
            >
              {phrase}
            </button>
          ))}
        </div>

        {showEmoji && (
          <div className="grid grid-cols-6 gap-1 py-2">
            {EMOJI.map((e) => (
              <button key={e} type="button" onClick={() => send('emoji', e)} aria-label={t('chat.sendEmoji', { emoji: e })} className="rounded-xl py-1.5 text-2xl hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green">
                {e}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={() => setShowEmoji((s) => !s)} aria-label={t('chat.emoji')} aria-pressed={showEmoji} className="rounded-xl p-2 text-ink-soft hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green">
            <Smile className="h-6 w-6" />
          </button>
          {allowFreeText ? (
            <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); send('text', text.trim()); }}>
              <label htmlFor="chat-text" className="sr-only">{t('chat.messageLabel')}</label>
              <input
                id="chat-text"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={280}
                placeholder={t('chat.messagePlaceholder')}
                className="flex-1 rounded-2xl border-2 border-line bg-paper px-4 h-12 font-semibold text-ink focus:outline-none focus:border-brand-green"
              />
              <Button type="submit" variant="primary" size="md" disabled={!text.trim()} aria-label={t('chat.send')}>
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          ) : (
            <p className="flex-1 text-xs font-semibold text-ink-soft">
              {t('chat.minorNotice')}
            </p>
          )}
        </div>
      </div>
    </Card>
  ) : (
    <Card padding="lg" className="hidden md:flex h-full items-center justify-center text-center">
      <div>
        <div className="flex justify-center"><Parrot state="idle" size={130} /></div>
        <p className="mt-3 text-ink-soft font-semibold">{t('chat.selectFriend')}</p>
      </div>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {feedback && <p role="status" className="mb-3 text-sm font-bold text-brand-green">{feedback}</p>}
      <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[70vh]">
        {/* Mobile: show list OR thread. Desktop: both. */}
        <div className={activeFriend ? 'hidden md:block h-full' : 'h-full'}>{FriendList}</div>
        <div className={activeFriend ? 'h-full' : 'hidden md:block h-full'}>{Thread}</div>
      </div>

      <ConfirmDialog
        open={!!dialog}
        title={dialog === 'block' ? t('social.blockTitle', { username: activeFriend?.username }) : t('social.reportTitle', { username: activeFriend?.username })}
        description={dialog === 'block' ? t('chat.blockDesc') : t('social.reportDesc')}
        confirmLabel={dialog === 'block' ? t('social.block') : t('social.report')}
        loading={dialogLoading}
        onConfirm={runDialog}
        onCancel={() => { setDialog(null); setReportDetails(''); }}
      >
        {dialog === 'report' && (
          <div className="mt-4">
            <label htmlFor="chat-report-details" className="block text-xs font-bold text-ink-soft mb-1">{t('social.detailsLabel')}</label>
            <textarea
              id="chat-report-details"
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

export default ChatPage;
