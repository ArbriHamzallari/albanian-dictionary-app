import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { openPremiumCheckout } from '../utils/paddleCheckout.js';
import { getTheme } from '../utils/userService.js';
import { useAuth } from '../context/AuthContext.jsx';
import Button from './ui/Button.jsx';
import { t } from '../i18n/index.js';

const PremiumCheckoutButton = ({ fullWidth = false, size = 'lg', plan = 'annual' }) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startCheckout = async () => {
    if (!isLoggedIn) {
      navigate('/hyr');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.get('/billing/checkout-config');
      // Pick the chosen plan's price id, falling back to annual if the plan is
      // unavailable (e.g. monthly not configured).
      const priceId = response.data.plans?.[plan]?.priceId || response.data.plans?.annual?.priceId;
      await openPremiumCheckout(response.data, getTheme(), priceId);
    } catch {
      setError(t('premiumButton.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={fullWidth ? 'w-full' : 'inline-block'}>
      <Button variant="primary" size={size} fullWidth={fullWidth} loading={loading} onClick={startCheckout}>
        {loading ? t('premiumButton.loading') : t('premiumButton.ctaGeneric')}
      </Button>
      {error && <p className="text-sm font-semibold text-accent-coral mt-2">{error}</p>}
    </div>
  );
};

export default PremiumCheckoutButton;
