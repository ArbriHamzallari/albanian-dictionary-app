import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, X } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Button from '../components/ui/Button.jsx';
import { unlockAchievement } from '../utils/userService.js';
import { t } from '../i18n/index.js';

const EMPTY_FORM = {
  borrowed_word: '',
  suggested_albanian: '',
  suggested_definition: '',
  submitter_name: '',
  submitter_email: '',
};

const SuggestWord = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const resumedRef = useRef(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const doSubmit = useCallback(async (payload) => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await api.post('/suggestions', payload);
      setMessage(response.data.message || t('suggest.successMessage'));
      setFormData(EMPTY_FORM);
      unlockAchievement('suggester');
    } catch {
      setError(t('suggest.errorMessage'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Resume after auth: Login/Register redirect back here carrying the payload in
  // router state (in-memory, never localStorage). Prefill the form and submit it
  // once, now attributed to the authenticated user. Clear the state immediately
  // so a refresh can't resubmit, and guard against StrictMode's double effect.
  useEffect(() => {
    const resume = location.state?.suggestion;
    if (resume && !resumedRef.current) {
      resumedRef.current = true;
      setFormData(resume);
      navigate(location.pathname, { replace: true, state: {} });
      doSubmit(resume);
    }
  }, [location, navigate, doSubmit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Word proposal is a conversion moment: nudge guests to create an account so
    // they can track the review, but keep an anonymous path open.
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    doSubmit(formData);
  };

  const goAuth = (path) => {
    navigate(path, { state: { from: '/propozo', suggestion: formData } });
  };

  const submitAnonymous = () => {
    setShowAuthModal(false);
    doSubmit(formData);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <span className="text-5xl block mb-3">💡</span>
        <h2 className="text-3xl font-black text-heading dark:text-dark-text mb-2">
          {t('suggest.title')}
        </h2>
        <p className="text-muted dark:text-dark-muted font-semibold">
          {t('suggest.desc')}
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="card space-y-5"
      >
        <div>
          <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('suggest.borrowedLabel')}</label>
          <input name="borrowed_word" value={formData.borrowed_word} onChange={handleChange} required className="input-field" placeholder={t('suggest.borrowedPlaceholder')} />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('suggest.correctLabel')}</label>
          <input name="suggested_albanian" value={formData.suggested_albanian} onChange={handleChange} className="input-field" placeholder={t('suggest.correctPlaceholder')} />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('suggest.definitionLabel')}</label>
          <textarea name="suggested_definition" value={formData.suggested_definition} onChange={handleChange} rows="3" className="input-field" placeholder={t('suggest.definitionPlaceholder')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('suggest.nameLabel')}</label>
            <input name="submitter_name" value={formData.submitter_name} onChange={handleChange} className="input-field" placeholder={t('suggest.namePlaceholder')} />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('suggest.emailLabel')}</label>
            <input name="submitter_email" value={formData.submitter_email} onChange={handleChange} type="email" className="input-field" placeholder={t('suggest.emailPlaceholder')} />
          </div>
        </div>

        <ErrorMessage message={error} />

        {message && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-3 bg-fjalingo-green/10 border-2 border-fjalingo-green/20 text-fjalingo-green px-5 py-4 rounded-2xl font-semibold"
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{message}</span>
          </motion.div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />
          {loading ? t('suggest.submitLoading') : t('suggest.submit')}
        </button>
      </motion.form>

      {/* Guest conversion prompt (UX-3) */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 px-4"
            role="dialog"
            aria-modal="true"
            aria-label={t('suggest.authModal.title')}
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl border border-line bg-paper p-6 sm:p-8 shadow-xl"
            >
              <button
                onClick={() => setShowAuthModal(false)}
                aria-label={t('common.close')}
                className="absolute right-4 top-4 p-1.5 rounded-xl text-ink-soft hover:bg-cloud transition"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="block text-4xl text-center mb-3">💡</span>
              <h2 className="text-center text-xl font-black text-ink">{t('suggest.authModal.title')}</h2>
              <p className="mt-2 text-center text-sm font-semibold text-ink-soft">{t('suggest.authModal.desc')}</p>
              <div className="mt-6 flex flex-col gap-3">
                <Button variant="primary" size="md" fullWidth onClick={() => goAuth('/regjistrohu')}>
                  {t('suggest.authModal.createProfile')}
                </Button>
                <Button variant="secondary" size="md" fullWidth onClick={() => goAuth('/hyr')}>
                  {t('suggest.authModal.login')}
                </Button>
                <button
                  onClick={submitAnonymous}
                  className="text-sm font-bold text-ink-soft hover:text-ink transition py-1"
                >
                  {t('suggest.authModal.anonymous')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuggestWord;
