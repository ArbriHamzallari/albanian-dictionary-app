import { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, Ban, ShieldCheck, Check } from 'lucide-react';
import api from '../utils/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { t } from '../i18n/index.js';

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('sq-AL') : '—');

// Maps an auto-moderation reason code to its Albanian label.
const reasonLabel = (reason) => t(`admin.safety.reason.${reason}`);

// Trust & Safety surface (INF-3): the auto-moderation event trail with one-click
// ban/unban (reuses AUTH-5's is_suspended via PATCH /users) and resolve.
const AdminTrustSafety = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/moderation-events');
      setEvents(res.data.events || []);
    } catch {
      setError(t('admin.safety.loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const toggleSuspend = async (uuid, nextSuspended) => {
    setError('');
    try {
      await api.patch(`/admin/users/${uuid}`, { is_suspended: nextSuspended });
      await fetchEvents();
    } catch (err) {
      setError(err.response?.data?.message || t('admin.safety.actionError'));
    }
  };

  const resolve = async (id) => {
    setError('');
    try {
      await api.post(`/admin/moderation-events/${id}/resolve`);
      await fetchEvents();
    } catch (err) {
      setError(err.response?.data?.message || t('admin.safety.actionError'));
    }
  };

  return (
    <div className="card">
      <h3 className="mb-6 flex items-center gap-2 text-sm font-black text-heading dark:text-dark-text">
        <ShieldAlert className="h-4 w-4 text-accent-coral" aria-hidden="true" />
        {t('admin.safety.heading')}
      </h3>

      <ErrorMessage message={error} />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border dark:border-dark-border">
                <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted">{t('admin.safety.colTime')}</th>
                <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted">{t('admin.safety.colSender')}</th>
                <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted hidden sm:table-cell">{t('admin.safety.colRecipient')}</th>
                <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted">{t('admin.safety.colReason')}</th>
                <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted hidden md:table-cell">{t('admin.safety.colExcerpt')}</th>
                <th className="text-right py-3 px-2 font-bold text-muted dark:text-dark-muted">{t('admin.safety.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className={`border-b border-border/50 dark:border-dark-border/50 ${ev.status === 'resolved' ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-2 text-muted dark:text-dark-muted whitespace-nowrap">{formatDateTime(ev.created_at)}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-heading dark:text-dark-text">{ev.sender_username || '—'}</span>
                      {ev.sender_suspended && <span className="badge badge-red">{t('admin.safety.suspended')}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-muted dark:text-dark-muted hidden sm:table-cell">{ev.recipient_username || '—'}</td>
                  <td className="py-3 px-2"><span className="badge badge-orange">{reasonLabel(ev.reason)}</span></td>
                  <td className="py-3 px-2 text-muted dark:text-dark-muted hidden md:table-cell max-w-xs truncate">{ev.excerpt || '—'}</td>
                  <td className="py-3 px-2 text-right whitespace-nowrap">
                    {ev.sender_id && (
                      <button
                        onClick={() => toggleSuspend(ev.sender_id, !ev.sender_suspended)}
                        className="mr-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-accent-coral hover:bg-accent-coral/10 transition"
                        title={ev.sender_suspended ? t('admin.safety.unban') : t('admin.safety.ban')}
                      >
                        {ev.sender_suspended ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        {ev.sender_suspended ? t('admin.safety.unban') : t('admin.safety.ban')}
                      </button>
                    )}
                    {ev.status === 'open' && (
                      <button
                        onClick={() => resolve(ev.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-brand-green hover:bg-brand-green/10 transition"
                        title={t('admin.safety.resolve')}
                      >
                        <Check className="h-4 w-4" /> {t('admin.safety.resolve')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!events.length && <p className="text-center text-muted py-8">{t('admin.safety.none')}</p>}
        </div>
      )}
    </div>
  );
};

export default AdminTrustSafety;
