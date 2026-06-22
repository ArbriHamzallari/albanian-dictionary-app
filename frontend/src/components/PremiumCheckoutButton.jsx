import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { openPremiumCheckout } from '../utils/paddleCheckout.js';
import { useAuth } from '../context/AuthContext.jsx';
import Button from './ui/Button.jsx';

const PremiumCheckoutButton = ({ fullWidth = false, size = 'lg' }) => {
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
      await openPremiumCheckout(response.data);
    } catch {
      setError('Pagesa Premium nuk u hap. Provoni përsëri.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={fullWidth ? 'w-full' : 'inline-block'}>
      <Button variant="primary" size={size} fullWidth={fullWidth} loading={loading} onClick={startCheckout}>
        {loading ? 'Duke hapur…' : 'Bëhu Premium · 25 EUR/vit'}
      </Button>
      {error && <p className="text-sm font-semibold text-accent-coral mt-2">{error}</p>}
    </div>
  );
};

export default PremiumCheckoutButton;
