import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle } from 'lucide-react';
import api from '../utils/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { unlockAchievement } from '../utils/userService.js';
import { t } from '../i18n/index.js';

const SuggestWord = () => {
  const [formData, setFormData] = useState({
    borrowed_word: '',
    suggested_albanian: '',
    suggested_definition: '',
    submitter_name: '',
    submitter_email: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/suggestions', formData);
      setMessage(response.data.message || t('suggest.successMessage'));
      setFormData({ borrowed_word: '', suggested_albanian: '', suggested_definition: '', submitter_name: '', submitter_email: '' });
      unlockAchievement('suggester');
    } catch {
      setError(t('suggest.errorMessage'));
    } finally {
      setLoading(false);
    }
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
    </div>
  );
};

export default SuggestWord;
