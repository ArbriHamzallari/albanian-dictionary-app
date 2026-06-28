import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Gift, Ban, ShieldCheck, Trash2, Pencil } from 'lucide-react';
import api from '../utils/api.js';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { t } from '../i18n/index.js';

const ROLES = ['user', 'admin'];

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('sq-AL') : '—');
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('sq-AL') : '—');

// Single-user view (AUTH-5): profile + editable fields, stats, read-only Paddle
// subscription mirror + complimentary grant, and login history.
const AdminUserDetail = ({ uuid, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', role: 'user', avatar_filename: '' });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/users/${uuid}`);
      setData(res.data);
      setForm({
        username: res.data.user.username || '',
        role: res.data.user.role || 'user',
        avatar_filename: res.data.user.avatar_filename || '',
      });
    } catch {
      setError(t('admin.users.loadError'));
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const patch = async (payload, okMsg) => {
    setError('');
    try {
      await api.patch(`/admin/users/${uuid}`, payload);
      flash(okMsg);
      await fetchDetail();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || t('admin.users.updateError'));
      return false;
    }
  };

  const saveEdits = async () => {
    setSaving(true);
    const ok = await patch(
      { username: form.username, role: form.role, avatar_filename: form.avatar_filename },
      t('admin.users.updated'),
    );
    setSaving(false);
    if (ok) setEditing(false);
  };

  const toggleSuspend = () => {
    patch({ is_suspended: !data.user.is_suspended }, t('admin.users.updated'));
  };

  const grantComplimentary = async () => {
    setError('');
    try {
      await api.post(`/admin/users/${uuid}/grant-complimentary`);
      flash(t('admin.users.granted'));
      await fetchDetail();
    } catch (err) {
      setError(err.response?.data?.message || t('admin.users.grantError'));
    }
  };

  const deleteUser = async () => {
    setError('');
    try {
      await api.delete(`/admin/users/${uuid}`);
      setDeleteOpen(false);
      onBack();
    } catch (err) {
      setDeleteOpen(false);
      setError(err.response?.data?.message || t('admin.users.deleteError'));
    }
  };

  if (loading) return <div className="card"><LoadingSpinner /></div>;
  if (!data) return <div className="card"><ErrorMessage message={error} /><button onClick={onBack} className="text-sm font-bold text-brand-green mt-4">{t('admin.users.back')}</button></div>;

  const { user, stats, subscription, loginEvents } = data;

  return (
    <div>
      <button onClick={onBack} className="text-sm font-bold text-brand-green mb-4">{t('admin.users.back')}</button>

      <ErrorMessage message={error} />
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="bg-brand-green/10 border-2 border-brand-green/20 text-brand-green px-5 py-4 rounded-2xl font-semibold mb-4"
        >
          {success}
        </motion.div>
      )}

      {/* Profile + actions */}
      <div className="card mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar filename={user.avatar_filename} size={56} />
            <div>
              <p className="text-lg font-black text-heading dark:text-dark-text">{user.username}</p>
              <p className="text-sm text-muted dark:text-dark-muted">{user.email}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className={`badge ${user.role === 'admin' ? 'badge-purple' : 'badge-blue'}`}>
                  {user.role === 'admin' ? t('admin.users.roleAdmin') : t('admin.users.roleUser')}
                </span>
                {user.is_suspended
                  ? <span className="badge badge-red">{t('admin.users.statusSuspended')}</span>
                  : <span className="badge badge-green">{t('admin.users.statusActive')}</span>}
                {user.is_minor && <span className="badge badge-blue">{t('admin.users.minorBadge')}</span>}
                {subscription.is_premium && <span className="badge badge-purple">{t('admin.users.premiumBadge')}</span>}
              </div>
            </div>
          </div>
          {!editing && (
            <Button onClick={() => setEditing(true)} variant="secondary" size="md">
              <Pencil className="w-4 h-4" /> {t('admin.users.edit')}
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('admin.users.usernameLabel')}</label>
              <input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('admin.users.roleLabel')}</label>
              <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className="input-field">
                {ROLES.map((r) => <option key={r} value={r}>{r === 'admin' ? t('admin.users.roleAdmin') : t('admin.users.roleUser')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('admin.users.avatarLabel')}</label>
              <input value={form.avatar_filename} onChange={(e) => setForm((p) => ({ ...p, avatar_filename: e.target.value }))} className="input-field" />
            </div>
            <div className="flex gap-3">
              <Button onClick={saveEdits} variant="primary" size="md" loading={saving}>{t('admin.users.save')}</Button>
              <Button onClick={() => { setEditing(false); fetchDetail(); }} variant="secondary" size="md">{t('admin.users.cancel')}</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button onClick={toggleSuspend} variant="secondary" size="md">
              {user.is_suspended ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              {user.is_suspended ? t('admin.users.unsuspend') : t('admin.users.suspend')}
            </Button>
            <Button onClick={() => setDeleteOpen(true)} variant="danger" size="md">
              <Trash2 className="w-4 h-4" /> {t('admin.users.delete')}
            </Button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Stats */}
        <div className="card">
          <h3 className="text-sm font-black text-fjalingo-blue mb-4">{t('admin.users.statsHeading')}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label={t('admin.users.xp')} value={stats?.xp ?? 0} />
            <Stat label={t('admin.users.level')} value={stats?.level ?? 1} />
            <Stat label={t('admin.users.streak')} value={stats?.streak ?? 0} />
            <Stat label={t('admin.users.quizzes')} value={stats?.total_quizzes ?? 0} />
          </div>
        </div>

        {/* Subscription (read-only mirror + complimentary grant) */}
        <div className="card">
          <h3 className="text-sm font-black text-fjalingo-purple mb-4">{t('admin.users.subscriptionHeading')}</h3>
          <div className="space-y-2 text-sm">
            <Row label={t('admin.users.provider')} value={subscription.provider || t('admin.users.noProvider')} />
            <Row label={t('admin.users.subStatus')} value={subscription.status} />
            <Row label={t('admin.users.periodEnd')} value={formatDate(subscription.current_period_end)} />
            <Row label={t('admin.users.complimentaryUntil')} value={formatDate(subscription.complimentary_until)} />
          </div>
          <Button onClick={grantComplimentary} variant="secondary" size="md" className="mt-4">
            <Gift className="w-4 h-4" /> {t('admin.users.grantComplimentary')}
          </Button>
        </div>
      </div>

      {/* Login history */}
      <div className="card">
        <h3 className="text-sm font-black text-heading dark:text-dark-text mb-4">{t('admin.users.loginHistoryHeading')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border dark:border-dark-border">
                <th className="text-left py-2 px-2 font-bold text-muted dark:text-dark-muted">{t('admin.users.colTime')}</th>
                <th className="text-left py-2 px-2 font-bold text-muted dark:text-dark-muted">{t('admin.users.colIp')}</th>
                <th className="text-left py-2 px-2 font-bold text-muted dark:text-dark-muted hidden sm:table-cell">{t('admin.users.colDevice')}</th>
              </tr>
            </thead>
            <tbody>
              {loginEvents.map((e) => (
                <tr key={e.id} className="border-b border-border/50 dark:border-dark-border/50">
                  <td className="py-2 px-2 text-heading dark:text-dark-text">{formatDateTime(e.created_at)}</td>
                  <td className="py-2 px-2 text-muted dark:text-dark-muted">{e.ip || '—'}</td>
                  <td className="py-2 px-2 text-muted dark:text-dark-muted hidden sm:table-cell truncate max-w-xs">{e.user_agent || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loginEvents.length && <p className="text-center text-muted py-6">{t('admin.users.noLogins')}</p>}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title={t('admin.users.deleteConfirmTitle')}
        description={t('admin.users.deleteConfirmDesc')}
        confirmLabel={t('admin.users.deleteConfirm')}
        variant="danger"
        onConfirm={deleteUser}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-card dark:bg-dark-card rounded-xl p-3">
    <p className="text-[11px] font-bold text-muted dark:text-dark-muted uppercase tracking-wide">{label}</p>
    <p className="text-lg font-black text-heading dark:text-dark-text leading-none mt-1">{value}</p>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted dark:text-dark-muted">{label}</span>
    <span className="font-semibold text-heading dark:text-dark-text">{value}</span>
  </div>
);

export default AdminUserDetail;
