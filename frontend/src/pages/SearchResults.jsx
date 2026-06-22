import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import SearchBar from '../components/SearchBar.jsx';
import WordCard from '../components/WordCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Heading from '../components/ui/Heading.jsx';
import Button from '../components/ui/Button.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
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
      } catch (err) {
        setResults([]);
        setError(err?.response?.data?.message || 'Nuk u gjetën rezultate për këtë kërkim.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const reduceMotion = useReducedMotion();

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <SearchBar initialValue={query} showHint />
      </div>

      <Heading level={3} className="mb-6">
        Rezultatet
        {results.length > 0 && (
          <span className="text-sm font-semibold text-ink-soft ml-2">
            ({results.length} fjalë u gjetën)
          </span>
        )}
      </Heading>

      {loading && <LoadingSpinner />}
      {!loading && <ErrorMessage message={error} />}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((word, i) => (
          <motion.div
            key={word.id}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: reduceMotion ? 0 : i * 0.04 }}
          >
            <WordCard word={word} />
          </motion.div>
        ))}
      </div>

      {!loading && !error && !results.length && query && (
        <div className="text-center py-16">
          <div className="flex justify-center"><Parrot state="think" size={150} /></div>
          <Heading level={3} className="mt-4">Nuk u gjetën rezultate</Heading>
          <p className="mt-1 text-ink-soft font-semibold">Provo me një fjalë tjetër ose propozo një fjalë të re.</p>
          <Link to="/propozo" className="inline-block mt-5">
            <Button variant="secondary" size="md">Propozo një fjalë</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
