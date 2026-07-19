import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Parrot from '../components/mascot/Parrot.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';
import { t } from '../i18n/index.js';

// PUBLIC page where the PARENT lands from the emailed link. No auth: the token in the
// URL is the credential. Warm and informational — explains what they are approving.
const ConsentLanding = () => {
  const { token } = useParams();
  const [phase, setPhase] = useState('ask'); // ask | working | approved | withdrawn
  const [error, setError] = useState('');

  const act = async (endpoint, donePhase) => {
    setError('');
    setPhase('working');
    try {
      await api.post(endpoint, { token });
      setPhase(donePhase);
    } catch (err) {
      setPhase('ask');
      if (err.response?.status === 400) {
        setError(t('consentLanding.errorInvalid'));
      } else {
        setError(err.response?.data?.message || t('common.error.generic'));
      }
    }
  };

  if (phase === 'approved' || phase === 'withdrawn') {
    const done = phase === 'approved';
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <div className="flex justify-center mb-4">
          <Parrot state={done ? 'celebrate-big' : 'idle'} size={150} />
        </div>
        <h2 className="text-2xl font-black text-heading dark:text-dark-text">
          {t(done ? 'consentLanding.approvedTitle' : 'consentLanding.withdrawnTitle')}
        </h2>
        <p className="text-sm text-muted dark:text-dark-muted font-semibold mt-2">
          {t(done ? 'consentLanding.approvedBody' : 'consentLanding.withdrawnBody')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex justify-center mb-4">
          <Parrot state="wave" size={140} />
        </div>
        <h2 className="text-2xl font-black text-heading dark:text-dark-text">{t('consentLanding.title')}</h2>
        <p className="text-sm text-muted dark:text-dark-muted font-semibold mt-2">
          {t('consentLanding.subtitle')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card space-y-5"
      >
        <p className="text-sm text-muted dark:text-dark-muted font-semibold">
          {t('consentLanding.explainer')}
        </p>

        <ErrorMessage message={error} />

        <button
          type="button"
          onClick={() => act('/auth/parental-consent', 'approved')}
          disabled={phase === 'working'}
          className="btn-primary w-full"
        >
          {phase === 'working' ? t('consentLanding.working') : t('consentLanding.approve')}
        </button>
        <button
          type="button"
          onClick={() => act('/auth/withdraw-consent', 'withdrawn')}
          disabled={phase === 'working'}
          className="text-sm font-bold text-muted dark:text-dark-muted hover:underline w-full text-center"
        >
          {t('consentLanding.decline')}
        </button>
      </motion.div>
    </div>
  );
};

export default ConsentLanding;
