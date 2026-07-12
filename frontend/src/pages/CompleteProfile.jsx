import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { t } from '../i18n/index.js';

const CONSENT_THRESHOLDS = {
  AT: 14, BE: 13, BG: 14, HR: 16, CY: 14, CZ: 15, DK: 13, EE: 13,
  FI: 13, FR: 15, DE: 16, GR: 15, HU: 16, IE: 16, IT: 14, LV: 13,
  LT: 14, LU: 16, MT: 13, NL: 16, PL: 16, PT: 13, RO: 16, SK: 16,
  SI: 15, ES: 14, SE: 13, US: 13, GB: 13, UK: 13,
};

// Age gate for accounts created without age/country (Google sign-ups). Until this
// is completed, the account stays fail-closed (private, off leaderboards).
const CompleteProfile = () => {
  const [age, setAge] = useState('');
  const [countryCode, setCountryCode] = useState('AL');
  const [parentalConsentGiven, setParentalConsentGiven] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isLoggedIn, loading: authLoading, user, completeProfile } = useAuth();

  // Only for logged-in users who haven't passed the age gate yet.
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) navigate('/hyr', { replace: true });
    else if (user?.profile?.age != null) navigate('/dashboard', { replace: true });
  }, [authLoading, isLoggedIn, user?.profile?.age, navigate]);

  const consentRequired = useMemo(() => {
    const numericAge = Number(age);
    if (!numericAge) return false;
    return numericAge < (CONSENT_THRESHOLDS[countryCode.toUpperCase()] || 16);
  }, [age, countryCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await completeProfile({ age, countryCode: countryCode.toUpperCase(), parentalConsentGiven });
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 403) {
        setError(err.response.data?.message || t('completeProfile.consentRequired'));
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError(t('common.error.network'));
      } else {
        setError(err.response?.data?.message || t('common.error.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-fjalingo-green/15 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-fjalingo-green" />
        </div>
        <h2 className="text-2xl font-black text-heading dark:text-dark-text">{t('completeProfile.title')}</h2>
        <p className="text-sm text-muted dark:text-dark-muted font-semibold mt-1">
          {t('completeProfile.subtitle')}
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="card space-y-5"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('auth.register.ageLabel')}</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              min={13}
              max={120}
              className="input-field"
              placeholder="13"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('auth.register.countryLabel')}</label>
            <input
              type="text"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.slice(0, 2).toUpperCase())}
              required
              minLength={2}
              maxLength={2}
              className="input-field uppercase"
              placeholder="AL"
            />
          </div>
        </div>

        {Number(age) > 0 && Number(age) < 13 && (
          <p className="text-xs font-semibold text-fjalingo-coral">
            {t('auth.register.ageTooYoung')}
          </p>
        )}

        {Number(age) >= 13 && Number(age) < 18 && (
          <p className="text-xs font-semibold text-muted dark:text-dark-muted">
            {t('auth.register.minorPrivacyNote')}
          </p>
        )}

        {consentRequired && (
          <label className="flex items-start gap-3 text-sm font-semibold text-muted dark:text-dark-muted">
            <input
              type="checkbox"
              checked={parentalConsentGiven}
              onChange={(e) => setParentalConsentGiven(e.target.checked)}
              required
              className="mt-1"
            />
            {t('auth.register.consentLabel')}
          </label>
        )}

        <ErrorMessage message={error} />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t('completeProfile.submitLoading') : t('completeProfile.submit')}
        </button>
      </motion.form>
    </div>
  );
};

export default CompleteProfile;
