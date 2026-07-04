import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Seo, { SITE_URL } from '../components/Seo.jsx';
import api from '../utils/api.js';
import { t } from '../i18n/index.js';

// Each word page is individually indexable as a DefinedTerm (schema.org).
const buildJsonLd = (word) => ({
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  name: word.correct_albanian || word.borrowed_word,
  description: word.definitions?.[0]?.definition_text || word.borrowed_word,
  inDefinedTermSet: {
    '@type': 'DefinedTermSet',
    name: 'Fjalori Fjalingo',
    url: SITE_URL,
  },
  url: `${SITE_URL}/fjala/${word.slug}`,
  inLanguage: 'sq',
});

const WordDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [word, setWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const res = await api.get(`/words/${encodeURIComponent(slug)}`);
        if (!active) return;
        const w = res.data.word;
        // Canonicalize: arriving via a legacy id or non-canonical value redirects
        // (replace) to the slug URL — the SPA equivalent of a 301.
        if (w.slug && w.slug !== slug) {
          navigate(`/fjala/${w.slug}`, { replace: true });
          return;
        }
        setWord(w);
      } catch {
        if (active) setError(t('wordDetail.notFound'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, navigate]);

  const isHeritage = word?.word_type === 'heritage';
  const definition = word?.definitions?.[0]?.definition_text;
  const example = word?.examples?.[0];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {word && (
        <Seo
          title={`${isHeritage ? word.borrowed_word : word.correct_albanian} — Fjalingo`}
          description={definition || undefined}
          path={`/fjala/${word.slug}`}
          type="article"
        >
          <script type="application/ld+json">{JSON.stringify(buildJsonLd(word))}</script>
        </Seo>
      )}

      <Link
        to="/"
        className="inline-flex items-center gap-1 text-fjalingo-green text-sm font-bold hover:gap-2 transition-all mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>

      {loading && <LoadingSpinner />}
      {!loading && <ErrorMessage message={error} />}

      {!loading && word && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="card border-fjalingo-green/30">
            {isHeritage ? (
              <span className="text-3xl font-black text-heading dark:text-dark-text">
                {word.borrowed_word}
              </span>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xl font-bold text-muted dark:text-dark-muted line-through decoration-1">
                  {word.borrowed_word}
                </span>
                <ArrowRight className="w-5 h-5 text-fjalingo-green" aria-hidden="true" />
                <span className="text-3xl font-black text-fjalingo-green">
                  {word.correct_albanian}
                </span>
              </div>
            )}

            {/* Origin badge → the history spine */}
            {word.origin_language && word.origin_name && (
              <Link
                to={`/origjina/${word.origin_language}`}
                className="badge badge-purple mt-4 inline-flex hover:opacity-80 transition-opacity"
              >
                {word.origin_name}
              </Link>
            )}

            {isHeritage && (
              <p className="text-sm font-semibold text-fjalingo-purple mt-4">
                {t('wordDetail.heritageNote')}
              </p>
            )}
          </div>

          {/* Definition */}
          {definition && (
            <div className="card">
              <h3 className="text-sm font-black text-fjalingo-blue tracking-wide mb-3">
                {t('wordDetail.definitionHeading')}
              </h3>
              <p className="text-body dark:text-dark-text font-semibold leading-relaxed">
                {definition}
              </p>
            </div>
          )}

          {/* One example pair — loan vs clean, visually contrasted. Heritage words
              have none (they are not quiz/replacement content). */}
          {!isHeritage && example && (
            <div className="card">
              <h3 className="text-sm font-black text-fjalingo-yellow tracking-wide mb-4">
                {t('wordDetail.examplesHeading')}
              </h3>
              <div className="space-y-2">
                <p className="rounded-xl bg-accent-coral/10 border border-accent-coral/20 px-4 py-3 text-sm font-semibold text-body dark:text-dark-text line-through decoration-accent-coral/60">
                  {example.sentence_loan}
                </p>
                <p className="rounded-xl bg-fjalingo-green/10 border border-fjalingo-green/20 px-4 py-3 text-sm font-semibold text-body dark:text-dark-text">
                  {example.sentence_clean}
                </p>
              </div>
            </div>
          )}

          {/* Learn the history of this word's layer */}
          {word.origin_language && (
            <Link
              to={`/origjina/${word.origin_language}`}
              className="inline-flex items-center gap-2 text-fjalingo-purple font-bold hover:gap-3 transition-all"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              {t('wordDetail.learnHistory')}
            </Link>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default WordDetail;
