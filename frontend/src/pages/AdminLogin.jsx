import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const data = await login(email, password);
      if (data.role !== 'admin') {
        setError('Kjo faqe është vetëm për administratorët.');
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Email ose fjalëkalim i pasaktë.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Nuk mund të lidhet me serverin. Kontrolloni që backend të jetë duke u ekzekutuar.');
      } else {
        setError(err.response?.data?.message || 'Ndodhi një gabim. Provoni përsëri.');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-fjalingo-green/15 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-fjalingo-green" />
        </div>
        <h2 className="text-2xl font-black text-heading dark:text-dark-text">Hyrje Admin</h2>
        <p className="text-sm text-muted dark:text-dark-muted font-semibold mt-1">Fjalingo Admin Panel</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="card space-y-5"
      >
        <div>
          <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field"
            placeholder="email@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">Fjalëkalimi</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
            placeholder="••••••••"
          />
        </div>

        <ErrorMessage message={error} />

        <button type="submit" className="btn-primary w-full">
          Hyr
        </button>
      </motion.form>
    </div>
  );
};

export default AdminLogin;
