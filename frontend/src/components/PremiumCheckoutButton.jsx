import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { openPremiumCheckout } from '../utils/paddleCheckout.js';
import { useAuth } from '../context/AuthContext.jsx';

const PremiumCheckoutButton = ({ className = 'btn-primary' }) => {
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
    <div>
      <button type="button" onClick={startCheckout} disabled={loading} className={className}>
        {loading ? 'Duke hapur...' : 'Bëhu Premium - 25 EUR/vit'}
      </button>
      {error && <p className="text-sm font-semibold text-fjalingo-red mt-2">{error}</p>}
    </div>
  );
};

export default PremiumCheckoutButton;
