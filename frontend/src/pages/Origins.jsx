import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Seo from '../components/Seo.jsx';
import api from '../utils/api.js';
import { t } from '../i18n/index.js';

// Fixed taxonomy order so the cards number like a stable 1..N path (WEB-1),
// regardless of how word counts grow.
const ORIGIN_ORDER = ['neolatine', 'anglisht', 'turqisht', 'greqisht', 'sllavisht', 'gjermanisht'];

// Teaser = first sentence of the intro narrative.
const firstSentence = (text) => {
  if (!text) return '';
  const match = text.match(/^[^.!?]*[.!?]/);
  return match ? match[0] : text;
};

const Origins = () => {
  const [origins, setOrigins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/public/origins');
        setOrigins(res.data.origins || []);
      } catch {
        setError(t('origins.loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ordered = [...origins].sort(
    (a, b) => ORIGIN_ORDER.indexOf(a.code) - ORIGIN_ORDER.indexOf(b.code),
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Seo title={t('origins.seoTitle')} description={t('origins.seoDesc')} path="/origjina" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="text-3xl md:text-4xl font-black text-heading dark:text-dark-text mb-2">
          {t('origins.title')}
        </h1>
        <p className="text-muted dark:text-dark-muted font-semibold max-w-2xl mx-auto">
          {t('origins.lead')}
        </p>
      </motion.div>

      {loading && <LoadingSpinner />}
      {!loading && <ErrorMessage message={error} />}

      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2">
          {ordered.map((o, i) => (
            <motion.div
              key={o.code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/origjina/${o.code}`} className="card card-hover block h-full">
                <div className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-fjalingo-green/10 text-fjalingo-green font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-heading dark:text-dark-text">
                      {o.name_sq}
                    </h2>
                    {o.era_sq && (
                      <p className="text-xs font-bold text-fjalingo-purple mt-0.5">{o.era_sq}</p>
                    )}
                    <p className="text-sm text-muted dark:text-dark-muted mt-2">
                      {firstSentence(o.intro_sq)}
                    </p>
                    <p className="text-xs font-bold text-fjalingo-green mt-3">
                      {o.word_count} {t('origins.wordsLabel')}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Origins;
