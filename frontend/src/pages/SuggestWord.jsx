import { useState } from 'react';
import api from '../utils/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

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

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/suggestions', formData);
      setMessage(response.data.message);
      setFormData({
        borrowed_word: '',
        suggested_albanian: '',
        suggested_definition: '',
        submitter_name: '',
        submitter_email: '',
      });
    } catch (err) {
      setError('Dërgimi dështoi. Ju lutem kontrolloni fushat dhe provoni përsëri.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold text-dark mb-4">PROPOZONI NJË FJALË</h2>
      <p className="text-gray-600 mb-6">
        Ndihmoni të pasurohet fjalori! Plotësoni formularin dhe sugjeroni një fjalë të re.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Fjala e huazuar *</label>
          <input
            name="borrowed_word"
            value={formData.borrowed_word}
            onChange={handleChange}
            required
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fjala e saktë shqipe</label>
          <input
            name="suggested_albanian"
            value={formData.suggested_albanian}
            onChange={handleChange}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Përkufizimi (opsionale)</label>
          <textarea
            name="suggested_definition"
            value={formData.suggested_definition}
            onChange={handleChange}
            rows="3"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Emri juaj</label>
          <input
            name="submitter_name"
            value={formData.submitter_name}
            onChange={handleChange}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email (opsionale)</label>
          <input
            name="submitter_email"
            value={formData.submitter_email}
            onChange={handleChange}
            type="email"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <ErrorMessage message={error} />
        {message && <p className="text-green-600 text-sm">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-70"
        >
          {loading ? 'Duke dërguar...' : 'Dërgo Propozimin'}
        </button>
      </form>
    </div>
  );
};

export default SuggestWord;
