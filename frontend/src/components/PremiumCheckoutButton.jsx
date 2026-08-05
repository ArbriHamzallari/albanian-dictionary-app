import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { openPremiumCheckout } from '../utils/paddleCheckout.js';
import { getTheme } from '../utils/userService.js';
import { useAuth } from '../context/AuthContext.jsx';
import Button from './ui/Button.jsx';
import { t } from '../i18n/index.js';

// PRICE-3: the idle label names the plan being bought, so the button confirms the
// PlanSelector choice instead of reading the same for both. Unknown/unconfigured
// plans fall back to the generic label rather than rendering a raw key.
const CTA_KEYS = {
  annual: 'premiumButton.ctaAnnual',
  monthly: 'premiumButton.ctaMonthly',
};

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
        {loading ? t('premiumButton.loading') : t(CTA_KEYS[plan] || 'premiumButton.ctaGeneric')}
      </Button>
      {error && <p className="text-sm font-semibold text-accent-coral mt-2">{error}</p>}
    </div>
  );
};

export default PremiumCheckoutButton;
