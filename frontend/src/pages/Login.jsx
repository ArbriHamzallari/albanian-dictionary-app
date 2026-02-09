import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      // Redirect admin users to admin dashboard
      if (data.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Email ose fjalëkalim i pasaktë.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Nuk mund të lidhet me serverin.');
      } else {
        setError(err.response?.data?.message || 'Ndodhi një gabim.');
      }
    } finally {
      setLoading(false);
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
          <LogIn className="w-8 h-8 text-fjalingo-green" />
        </div>
        <h2 className="text-2xl font-black text-heading dark:text-dark-text">Hyr</h2>
        <p className="text-sm text-muted dark:text-dark-muted font-semibold mt-1">
          Hyr në llogarinë tënde Fjalingo
        </p>
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
            placeholder="email@shembull.com"
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

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Duke hyrë...' : 'Hyr'}
        </button>

        <p className="text-center text-sm text-muted dark:text-dark-muted font-semibold">
          Nuk ke llogari?{' '}
          <Link to="/regjistrohu" className="text-fjalingo-green hover:underline font-bold">
            Regjistrohu
          </Link>
        </p>
      </motion.form>
    </div>
  );
};

export default Login;
