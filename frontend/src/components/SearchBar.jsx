import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchBar = ({ initialValue = '' }) => {
  const [query, setQuery] = useState(initialValue);
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!query.trim()) {
      return;
    }
    navigate(`/kerko?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center bg-white border border-gray-300 rounded-full shadow-sm overflow-hidden">
        <span className="px-4 text-gray-500">🔍</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Kërko fjalë të huazuara..."
          className="flex-1 py-3 px-2 text-base focus:outline-none"
          aria-label="Kërko fjalë"
        />
        <button
          type="submit"
          className="bg-primary text-white px-6 py-3 text-sm font-semibold hover:bg-red-600"
        >
          Kërko
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
