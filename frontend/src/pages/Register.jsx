import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [countryCode, setCountryCode] = useState('AL');
  const [parentalConsentGiven, setParentalConsentGiven] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const consentRequired = useMemo(() => {
    const numericAge = Number(age);
    if (!numericAge) return false;
    const thresholds = {
      AT: 14, BE: 13, BG: 14, HR: 16, CY: 14, CZ: 15, DK: 13, EE: 13,
      FI: 13, FR: 15, DE: 16, GR: 15, HU: 16, IE: 16, IT: 14, LV: 13,
      LT: 14, LU: 16, MT: 13, NL: 16, PL: 16, PT: 13, RO: 16, SK: 16,
      SI: 15, ES: 14, SE: 13, US: 13, GB: 13, UK: 13,
    };
    return numericAge < (thresholds[countryCode.toUpperCase()] || 16);
  }, [age, countryCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        username,
        email,
        password,
        age,
        countryCode: countryCode.toUpperCase(),
        parentalConsentGiven,
      });
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.message);
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
          <UserPlus className="w-8 h-8 text-fjalingo-green" />
        </div>
        <h2 className="text-2xl font-black text-heading dark:text-dark-text">Regjistrohu</h2>
        <p className="text-sm text-muted dark:text-dark-muted font-semibold mt-1">
          Krijo llogarinë tënde Fjalingo
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
          <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">Emri i përdoruesit</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_-]+"
            className="input-field"
            placeholder="emri_yt"
          />
        </div>
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
            minLength={6}
            className="input-field"
            placeholder="••••••••"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">Mosha</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              min={1}
              max={120}
              className="input-field"
              placeholder="13"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">Shteti</label>
            <input
              type="text"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.slice(0, 2).toUpperCase())}
              required
              minLength={2}
              maxLength={2}
              className="input-field uppercase"
              placeholder="AL"
            />
          </div>
        </div>

        {Number(age) > 0 && Number(age) < 18 && (
          <p className="text-xs font-semibold text-muted dark:text-dark-muted">
            Profilet e fëmijëve janë private si parazgjedhje dhe renditja publike shfaq vetëm emër publik dhe avatar.
          </p>
        )}

        {consentRequired && (
          <label className="flex items-start gap-3 text-sm font-semibold text-muted dark:text-dark-muted">
            <input
              type="checkbox"
              checked={parentalConsentGiven}
              onChange={(e) => setParentalConsentGiven(e.target.checked)}
              required
              className="mt-1"
            />
            Kam pëlqimin e prindit ose kujdestarit për të krijuar këtë llogari.
          </label>
        )}

        <ErrorMessage message={error} />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Duke u regjistruar...' : 'Regjistrohu'}
        </button>

        <p className="text-center text-sm text-muted dark:text-dark-muted font-semibold">
          Ke tashmë llogari?{' '}
          <Link to="/hyr" className="text-fjalingo-green hover:underline font-bold">
            Hyr
          </Link>
        </p>
      </motion.form>
    </div>
  );
};

export default Register;
