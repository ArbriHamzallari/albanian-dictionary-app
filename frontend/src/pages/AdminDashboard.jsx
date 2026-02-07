import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

const AdminDashboard = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [topSearches, setTopSearches] = useState([]);
  const [error, setError] = useState('');

  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError('Duhet të hyni si admin për të parë këtë faqe.');
        return;
      }

      try {
        const [suggestionsResponse, analyticsResponse] = await Promise.all([
          api.get('/suggestions', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/admin/analytics/top-searches', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setSuggestions(suggestionsResponse.data.suggestions || []);
        setTopSearches(analyticsResponse.data.top_searches || []);
      } catch (err) {
        setError('Nuk mund të ngarkohen të dhënat e adminit.');
      }
    };

    fetchData();
  }, [token]);

  const handleSuggestion = async (id, action) => {
    if (!token) return;
    try {
      await api.put(`/suggestions/${id}/${action}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuggestions((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError('Ndodhi një gabim gjatë përditësimit të propozimit.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold text-dark mb-6">ADMIN PANEL - Shkolla 7 Marsi</h2>
      <ErrorMessage message={error} />

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-primary">PROPOZIME TË PASHQYRTUARA</h3>
          <div className="mt-4 space-y-4">
            {suggestions
              .filter((suggestion) => suggestion.status === 'pending')
              .map((suggestion) => (
                <div key={suggestion.id} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-semibold">
                    "{suggestion.borrowed_word}" → {suggestion.suggested_albanian || 'Pa sugjerim'}
                  </p>
                  <p className="text-sm text-gray-600">Propozuar nga: {suggestion.submitter_name || 'Anonim'}</p>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleSuggestion(suggestion.id, 'approve')}
                      className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      Aprovo
                    </button>
                    <button
                      onClick={() => handleSuggestion(suggestion.id, 'reject')}
                      className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      Refuzo
                    </button>
                  </div>
                </div>
              ))}
            {!suggestions.length && <p className="text-sm text-gray-500">Nuk ka propozime të reja.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-primary">KËRKESAT MË TË KËRKUARA</h3>
          <ul className="mt-4 space-y-2">
            {topSearches.map((search) => (
              <li key={search.search_term} className="text-sm text-gray-700">
                "{search.search_term}" ({search.total} kërkime)
              </li>
            ))}
            {!topSearches.length && <li className="text-sm text-gray-500">Nuk ka të dhëna ende.</li>}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-primary">VEPRIME TË SHPEJTA</h3>
        <p className="text-sm text-gray-600 mt-2">
          Përdorni API-në për të shtuar, përditësuar ose fshirë fjalë nga paneli admin.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
