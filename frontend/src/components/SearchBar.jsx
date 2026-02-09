import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

const SearchBar = ({ initialValue = '', showHint = false }) => {
  const [query, setQuery] = useState(initialValue);
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/kerko?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center bg-white dark:bg-dark-card border-2 border-border dark:border-dark-border rounded-pill shadow-card hover:shadow-card-hover transition-all overflow-hidden">
          <span className="pl-5 pr-2 text-muted dark:text-dark-muted">
            <Search className="w-5 h-5" />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kërko fjalë të huazuara..."
            className="flex-1 py-4 px-3 text-base font-semibold text-heading dark:text-dark-text
                       bg-transparent placeholder:text-muted dark:placeholder:text-dark-muted focus:outline-none"
            aria-label="Kërko fjalë"
          />
          <button
            type="submit"
            className="bg-fjalingo-green text-white px-6 sm:px-8 py-4 text-sm font-bold
                       hover:bg-fjalingo-green-dark transition-colors whitespace-nowrap"
          >
            Kërko
          </button>
        </div>
      </form>
      {showHint && (
        <p className="text-center text-sm font-semibold text-muted dark:text-dark-muted mt-3">
          Shembull: investigoj, marketing, weekend
        </p>
      )}
    </div>
  );
};

export default SearchBar;
