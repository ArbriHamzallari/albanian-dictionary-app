import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { initClarity, identifyClarityUser, setClarityTags } from '../utils/clarity.js';

/** Wires Microsoft Clarity: init once, identify + tags on auth/route changes. */
export default function ClarityAnalytics() {
  const location = useLocation();
  const { user, loading, isLoggedIn } = useAuth();

  useEffect(() => {
    initClarity();
  }, []);

  useEffect(() => {
    if (loading || !isLoggedIn || !user?.profile) return;

    identifyClarityUser(user.profile, location.pathname);
    setClarityTags({
      tier: user.entitlement?.tier || 'free',
      role: user.profile.role || 'user',
    });
  }, [location.pathname, user, loading, isLoggedIn]);

  return null;
}
