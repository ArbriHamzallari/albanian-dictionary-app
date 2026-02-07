import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import WordCard from '../components/WordCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';

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
      } catch (err) {
        setResults([]);
        setError('Nuk u gjetën rezultate për këtë kërkim.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <SearchBar initialValue={query} />
      </div>

      <h2 className="text-xl font-semibold mb-4">REZULTATET</h2>

      {loading && <LoadingSpinner />}
      {!loading && <ErrorMessage message={error} />}

      <div className="grid gap-6">
        {results.map((word) => (
          <WordCard key={word.id} word={word} />
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
