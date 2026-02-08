import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('auth_token', response.data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Email ose fjalëkalim i pasaktë.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Nuk mund të lidhet me serverin. Kontrolloni që backend të jetë duke u ekzekutuar (npm run dev në backend).');
      } else {
        setError(err.response?.data?.message || 'Ndodhi një gabim. Provoni përsëri.');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold text-dark mb-4">Hyrje Admin</h2>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fjalëkalimi</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <ErrorMessage message={error} />
        <button type="submit" className="bg-primary text-white w-full py-2 rounded-lg font-semibold">
          Hyr
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
