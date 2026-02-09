import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../utils/api.js';
import Avatar from './Avatar.jsx';

const POLL_INTERVAL = 20_000; // 20 seconds

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // requestId being acted on
  const ref = useRef(null);

  // ── Fetch notifications ──────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.friendRequests || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Silently fail — user might be logged out or network hiccup
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // ── Close dropdown on outside click ──────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Actions ──────────────────────────────────────────────
  const handleAccept = async (requestId) => {
    setActionLoading(requestId);
    try {
      await api.post('/friends/accept', { request_id: requestId });
      await fetchNotifications();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (requestId) => {
    setActionLoading(requestId);
    try {
      await api.post('/friends/decline', { request_id: requestId });
      await fetchNotifications();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'tani';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-xl hover:bg-card dark:hover:bg-dark-card transition-colors"
        title="Njoftimet"
      >
        <Bell className="w-5 h-5 text-heading dark:text-dark-text" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-fjalingo-red text-white text-[10px] font-black rounded-full px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-dark-bg border-2 border-border dark:border-dark-border rounded-2xl shadow-card z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b-2 border-border dark:border-dark-border">
              <h4 className="text-sm font-black text-heading dark:text-dark-text">
                Njoftimet
              </h4>
            </div>

            {/* Items */}
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-muted dark:text-dark-muted mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-muted dark:text-dark-muted">
                  Nuk ka njoftime
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border dark:divide-dark-border">
                {notifications.map((n) => (
                  <div
                    key={n.requestId}
                    className="px-4 py-3 hover:bg-card/50 dark:hover:bg-dark-card/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar filename={n.senderAvatar} size={36} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-heading dark:text-dark-text truncate">
                          {n.senderUsername}
                        </p>
                        <p className="text-xs text-muted dark:text-dark-muted">
                          Kërkesë miqësie &middot; {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-2 ml-12">
                      <button
                        onClick={() => handleAccept(n.requestId)}
                        disabled={actionLoading === n.requestId}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-fjalingo-green/10 text-fjalingo-green hover:bg-fjalingo-green/20 transition disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Prano
                      </button>
                      <button
                        onClick={() => handleDecline(n.requestId)}
                        disabled={actionLoading === n.requestId}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-fjalingo-red/10 text-fjalingo-red hover:bg-fjalingo-red/20 transition disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Refuzo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
