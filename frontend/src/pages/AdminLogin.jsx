import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Heading from '../components/ui/Heading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

const inputClass = 'w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 font-bold text-ink focus:outline-none focus:border-brand-green';

const AdminLogin = () => {
  const reduceMotion = useReducedMotion();
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="text-center mb-8"
      >
        <span className="w-16 h-16 rounded-2xl bg-brand-green/15 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-brand-green" aria-hidden="true" />
        </span>
        <Heading level={2}>Hyrje Admin</Heading>
        <p className="text-sm text-ink-soft font-semibold mt-1">Fjalingo Admin Panel</p>
      </motion.div>

      <Card padding="lg" as="form" onSubmit={handleSubmit}>
        <div className="space-y-5">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-bold text-ink-soft mb-1">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-xs font-bold text-ink-soft mb-1">Fjalëkalimi</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <ErrorMessage message={error} />

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Hyr
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;
