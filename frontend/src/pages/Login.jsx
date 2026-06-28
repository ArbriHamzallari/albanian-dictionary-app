import { useState, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import Seo from '../components/Seo.jsx';
import { GOOGLE_CLIENT_ID } from '../utils/google.js';
import { t } from '../i18n/index.js';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuth();

  // A guest action (e.g. proposing a word) can send the user here to authenticate
  // and then resume. Honor that return target instead of the default dashboard.
  const resumeAfterAuth = (role) => {
    if (role === 'admin') { navigate('/admin/dashboard'); return; }
    const from = location.state?.from;
    if (from) { navigate(from, { state: { suggestion: location.state?.suggestion } }); return; }
    navigate('/dashboard');
  };

  const handleGoogle = useCallback(async (credential) => {
    setError('');
    setLoading(true);
    try {
      const data = await googleLogin(credential);
      if (data.needsProfileCompletion) navigate('/ploteso-profilin');
      else resumeAfterAuth(data.role);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.google.failed'));
    } finally {
      setLoading(false);
    }
  }, [googleLogin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      resumeAfterAuth(data.role);
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('auth.login.invalidCredentials'));
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError(t('common.error.network'));
      } else {
        setError(err.response?.data?.message || t('common.error.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <Seo
        title="Hyr — Fjalingo"
        description="Hyr në llogarinë tënde Fjalingo për të vazhduar mësimin e shqipes së vërtetë."
        path="/hyr"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-fjalingo-green/15 flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-8 h-8 text-fjalingo-green" />
        </div>
        <h2 className="text-2xl font-black text-heading dark:text-dark-text">{t('auth.login.title')}</h2>
        <p className="text-sm text-muted dark:text-dark-muted font-semibold mt-1">
          {t('auth.login.subtitle')}
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
          <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('common.field.email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field"
            placeholder={t('common.field.emailPlaceholder')}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">{t('common.field.password')}</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
            placeholder="••••••••"
          />
        </div>

        <ErrorMessage message={error} />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t('auth.login.submitLoading') : t('auth.login.submit')}
        </button>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border dark:bg-dark-border" />
              <span className="text-xs font-bold text-muted dark:text-dark-muted">{t('auth.or')}</span>
              <span className="h-px flex-1 bg-border dark:bg-dark-border" />
            </div>
            <GoogleSignInButton onCredential={handleGoogle} />
          </>
        )}

        <p className="text-center text-sm text-muted dark:text-dark-muted font-semibold">
          {t('auth.login.noAccount')}{' '}
          <Link to="/regjistrohu" className="text-fjalingo-green hover:underline font-bold">
            {t('auth.login.registerLink')}
          </Link>
        </p>
      </motion.form>
    </div>
  );
};

export default Login;
