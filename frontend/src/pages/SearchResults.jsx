import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SearchBar from '../components/SearchBar.jsx';
import WordCard from '../components/WordCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';
import { unlockAchievement } from '../utils/userService.js';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/words/search?q=${encodeURIComponent(query)}`);
        setResults(response.data.results || []);
        // Unlock first search achievement
        unlockAchievement('first_search');
      } catch {
        setResults([]);
        setError('Nuk u gjetën rezultate për këtë kërkim.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <SearchBar initialValue={query} showHint />
      </motion.div>

      <h2 className="text-lg font-black text-heading dark:text-dark-text mb-6">
        🔍 REZULTATET
        {results.length > 0 && (
          <span className="text-sm font-semibold text-muted dark:text-dark-muted ml-2">
            ({results.length} fjalë u gjetën)
          </span>
        )}
      </h2>

      {loading && <LoadingSpinner />}
      {!loading && <ErrorMessage message={error} />}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((word, i) => (
          <motion.div
            key={word.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <WordCard word={word} />
          </motion.div>
        ))}
      </div>

      {!loading && !error && !results.length && query && (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="text-lg font-bold text-heading dark:text-dark-text mb-2">
            Nuk u gjetën rezultate
          </p>
          <p className="text-sm text-muted dark:text-dark-muted">
            Provo me fjalë tjetër ose propozo një fjalë të re!
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
