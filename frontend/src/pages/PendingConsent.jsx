import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';
import { t } from '../i18n/index.js';

// Where a consent-pending account waits after signup. It is logged in but the route
// guard (App.jsx) holds it here until the parent approves via the emailed link.
const PendingConsent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');

  const hint = user?.profile?.parent_email_hint || '';

  const handleResend = async () => {
    setError('');
    setStatus('sending');
    try {
      await api.post('/auth/resend-consent');
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      if (err.response?.status === 429) {
        setError(t('pendingConsent.resendRateLimited'));
      } else {
        setError(err.response?.data?.message || t('common.error.generic'));
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex justify-center mb-4">
          <Parrot state="idle" size={140} />
        </div>
        <h2 className="text-2xl font-black text-heading dark:text-dark-text">{t('pendingConsent.title')}</h2>
        <p className="text-sm text-muted dark:text-dark-muted font-semibold mt-2">
          {t('pendingConsent.subtitle')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card space-y-5 text-center"
      >
        {hint && (
          <p className="text-sm font-semibold text-heading dark:text-dark-text">
            {t('pendingConsent.sentTo', { email: hint })}
          </p>
        )}
        <p className="text-sm text-muted dark:text-dark-muted font-semibold">
          {t('pendingConsent.whatNext')}
        </p>

        {status === 'sent' ? (
          <p className="text-sm font-bold text-fjalingo-green">{t('pendingConsent.resendSuccess')}</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={status === 'sending'}
            className="btn-secondary w-full"
          >
            {status === 'sending' ? t('pendingConsent.resendLoading') : t('pendingConsent.resendButton')}
          </button>
        )}

        <ErrorMessage message={error} />

        <button type="button" onClick={handleLogout} className="text-sm font-bold text-muted dark:text-dark-muted hover:underline">
          {t('pendingConsent.logout')}
        </button>
      </motion.div>
    </div>
  );
};

export default PendingConsent;
