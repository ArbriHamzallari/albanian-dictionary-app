import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../utils/api.js';
import Avatar from '../components/Avatar.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { t } from '../i18n/index.js';
import AdminUserDetail from './AdminUserDetail.jsx';

const PAGE_SIZE = 25;

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('sq-AL') : '—');

// User-management surface (AUTH-5). Rendered inside the admin dashboard tab.
// Shows a paginated, searchable list; selecting a row opens the detail view.
const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUuid, setSelectedUuid] = useState(null);

  const fetchUsers = useCallback(async (pageArg, qArg) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/users', { params: { page: pageArg, pageSize: PAGE_SIZE, q: qArg || undefined } });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
    } catch {
      setError(t('admin.users.loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce the search so we don't hit the API on every keystroke. Reset to
  // page 1 whenever the query changes.
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      fetchUsers(1, q);
    }, 300);
    return () => clearTimeout(id);
  }, [q, fetchUsers]);

  const goToPage = (next) => {
    setPage(next);
    fetchUsers(next, q);
  };

  if (selectedUuid) {
    return (
      <AdminUserDetail
        uuid={selectedUuid}
        onBack={() => {
          setSelectedUuid(null);
          fetchUsers(page, q);
        }}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-sm font-black text-heading dark:text-dark-text">
          {t('admin.users.heading')} ({t('admin.users.totalCount', { total })})
        </h3>
        <div className="flex items-center bg-white dark:bg-dark-bg border-2 border-border dark:border-dark-border rounded-xl px-3 w-full sm:w-72">
          <Search className="w-4 h-4 text-muted dark:text-dark-muted" aria-hidden="true" />
          <label htmlFor="admin-user-search" className="sr-only">{t('admin.users.searchPlaceholder')}</label>
          <input
            id="admin-user-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('admin.users.searchPlaceholder')}
            className="py-2 px-2 text-sm font-semibold bg-transparent text-heading dark:text-dark-text focus:outline-none w-full"
          />
        </div>
      </div>

      <ErrorMessage message={error} />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border dark:border-dark-border">
                  <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted">{t('admin.users.colUser')}</th>
                  <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted hidden sm:table-cell">{t('admin.users.colEmail')}</th>
                  <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted">{t('admin.users.colRole')}</th>
                  <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted">{t('admin.users.colStatus')}</th>
                  <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted hidden md:table-cell">{t('admin.users.colJoined')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.uuid}
                    onClick={() => setSelectedUuid(u.uuid)}
                    className="border-b border-border/50 dark:border-dark-border/50 hover:bg-card dark:hover:bg-dark-card transition cursor-pointer"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Avatar filename={u.avatar_filename} size={32} />
                        <span className="font-semibold text-heading dark:text-dark-text">{u.username}</span>
                        {u.is_minor && <span className="badge badge-blue">{t('admin.users.minorBadge')}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted dark:text-dark-muted hidden sm:table-cell">{u.email}</td>
                    <td className="py-3 px-2">
                      <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-blue'}`}>
                        {u.role === 'admin' ? t('admin.users.roleAdmin') : t('admin.users.roleUser')}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-1">
                        {u.is_suspended
                          ? <span className="badge badge-red">{t('admin.users.statusSuspended')}</span>
                          : <span className="badge badge-green">{t('admin.users.statusActive')}</span>}
                        {u.is_premium && <span className="badge badge-purple">{t('admin.users.premiumBadge')}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted dark:text-dark-muted hidden md:table-cell">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.length && <p className="text-center text-muted dark:text-dark-muted py-8">{t('admin.users.none')}</p>}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 text-sm font-bold text-brand-green disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> {t('admin.users.prev')}
              </button>
              <span className="text-sm font-semibold text-muted dark:text-dark-muted">
                {t('admin.users.pageInfo', { page, pages: totalPages })}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 text-sm font-bold text-brand-green disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('admin.users.next')} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminUsers;
