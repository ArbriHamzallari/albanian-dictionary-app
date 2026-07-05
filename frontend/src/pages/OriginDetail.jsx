import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Seo from '../components/Seo.jsx';
import api from '../utils/api.js';
import { t } from '../i18n/index.js';

const firstSentence = (text) => {
  if (!text) return '';
  const match = text.match(/^[^.!?]*[.!?]/);
  return match ? match[0] : text;
};

const OriginDetail = () => {
  const { code } = useParams();
  const [origin, setOrigin] = useState(null);
  const [words, setWords] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setWords([]);
    setPage(1);
    (async () => {
      try {
        const res = await api.get(`/public/origins/${code}?page=1`);
        if (!active) return;
        setOrigin(res.data.origin);
        setWords(res.data.words);
        setHasMore(res.data.hasMore);
      } catch (err) {
        if (!active) return;
        setError(err.response?.status === 404 ? t('origins.detail.notFound') : t('origins.loadError'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [code]);

  const loadMore = async () => {
    const next = page + 1;
    setLoadingMore(true);
    try {
      const res = await api.get(`/public/origins/${code}?page=${next}`);
      setWords((prev) => [...prev, ...res.data.words]);
      setHasMore(res.data.hasMore);
      setPage(next);
    } catch {
      setError(t('origins.loadError'));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {origin && (
        <Seo
          title={`${origin.name_sq} — Fjalingo`}
          description={firstSentence(origin.intro_sq)}
          path={`/origjina/${code}`}
        />
      )}

      <Link
        to="/origjina"
        className="inline-flex items-center gap-1 text-sm font-bold text-muted dark:text-dark-muted hover:text-fjalingo-green transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        {t('origins.detail.back')}
      </Link>

      {loading && <LoadingSpinner />}
      {!loading && <ErrorMessage message={error} />}

      {!loading && origin && (
        <>
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h1 className="text-3xl md:text-4xl font-black text-heading dark:text-dark-text">
              {origin.name_sq}
            </h1>
            {origin.era_sq && (
              <p className="text-sm font-bold text-fjalingo-purple mt-1">{origin.era_sq}</p>
            )}
            <p className="text-body dark:text-dark-muted font-medium leading-relaxed mt-4 whitespace-pre-line">
              {origin.intro_sq}
            </p>
            <Link
              to={`/kuizi?origjina=${code}`}
              className="btn-primary inline-flex items-center gap-2 mt-6"
            >
              {t('origins.detail.practiceCta')}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </motion.header>

          <h2 className="text-sm font-black text-fjalingo-blue tracking-wide mb-4">
            {t('origins.detail.wordsHeading')}
          </h2>

          {words.length === 0 ? (
            <p className="text-muted dark:text-dark-muted font-semibold">
              {t('origins.detail.empty')}
            </p>
          ) : (
            <ul className="space-y-2">
              {words.map((w) => (
                <li key={w.id}>
                  <Link
                    to={`/fjala/${w.id}`}
                    className="card flex items-center justify-between gap-3 py-3 hover:border-fjalingo-green/40 transition-colors"
                  >
                    <span className="font-bold text-heading dark:text-dark-text">
                      {w.borrowed_word}
                    </span>
                    {w.word_type === 'heritage' ? (
                      // Heritage words are trashëgimi, not "wrong words to fix" — show the
                      // heritage line, never a correction arrow.
                      <span className="text-sm font-semibold text-fjalingo-purple text-right">
                        {t('origins.detail.heritageLine')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-fjalingo-green font-bold text-right">
                        <ArrowRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        {w.correct_albanian}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-outline disabled:opacity-60"
              >
                {t('origins.detail.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OriginDetail;
