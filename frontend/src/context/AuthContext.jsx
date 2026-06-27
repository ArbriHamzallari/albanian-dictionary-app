import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';

const AuthContext = createContext(null);

const GUEST_PROGRESS_KEY = 'fjalingo_guest_progress';

// Browser IANA timezone (e.g. "Europe/Tirane"), used to anchor the streak day.
function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { profile, stats, rank, achievements }
  const [loading, setLoading] = useState(true);

  // Load the current user from the session cookie. The JWT is never in JS.
  //
  // Only an explicit 401 (after the api client already tried /auth/refresh)
  // means there is genuinely no session, so only then do we clear it.
  // Transient failures — network down, CORS, a Render cold start — must NEVER
  // drop a still-valid session, or the user appears "logged out on refresh".
  // We retry those with backoff, and the `online` listener below recovers the
  // session once connectivity returns.
  const loadUser = useCallback(async () => {
    const MAX_ATTEMPTS = 4;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
        setLoading(false);
        return;
      } catch (err) {
        if (err.response?.status === 401) {
          setUser(null); // genuine: no/lost session → guards redirect to /hyr
          setLoading(false);
          return;
        }
        // Transient (no response / 5xx / cold start): keep any existing
        // session, back off, and retry.
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        }
      }
    }
    // Retries exhausted without a definitive 401: do NOT clear the session.
    // Stop the initial spinner; the `online` listener recovers it later.
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Recover the session when connectivity returns (e.g. the user refreshed
  // while offline). A transient failure never cleared the httpOnly cookie, so
  // a successful /auth/me here restores the logged-in state.
  useEffect(() => {
    const onOnline = () => { loadUser(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [loadUser]);

  // Presence heartbeat for logged-in users (throttled server-side)
  useEffect(() => {
    if (!user?.profile) return undefined;

    const ping = () => { api.post('/auth/heartbeat').catch(() => {}); };
    ping();
    const interval = setInterval(ping, 120_000);
    return () => clearInterval(interval);
  }, [user?.profile]);

  function applyAuthResponse(data) {
    if (data.profile) {
      setUser({
        profile: data.profile,
        stats: data.stats || null,
        rank: data.rank ?? null,
        achievements: data.achievements || [],
        entitlement: data.entitlement || { tier: 'free' },
      });
    }
  }

  // ── Actions ────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    applyAuthResponse(res.data);
    // Return role explicitly so callers can redirect admin users
    return { ...res.data, role: res.data.role || res.data.profile?.role || 'user' };
  };

  const register = async ({ username, email, password, age, countryCode, parentalConsentGiven }) => {
    const res = await api.post('/auth/register', {
      username,
      email,
      password,
      age: Number(age),
      country_code: countryCode,
      parental_consent_given: parentalConsentGiven,
      timezone: getBrowserTimeZone(),
    });
    applyAuthResponse(res.data);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clearing local state below is enough even if the request fails.
    }
    setUser(null);
  };

  const updateUserProfile = (profileUpdate) => {
    if (!profileUpdate) return;
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          ...profileUpdate,
        },
      };
    });
  };

  const guestUpgrade = async ({ username, email, password, age, countryCode, parentalConsentGiven }) => {
    const guestProgress = getGuestProgress();
    const res = await api.post('/auth/guest-upgrade', {
      username,
      email,
      password,
      age: Number(age),
      country_code: countryCode,
      parental_consent_given: parentalConsentGiven,
      timezone: getBrowserTimeZone(),
      guestProgress,
    });
    clearGuestProgress();
    applyAuthResponse(res.data);
    return res.data;
  };

  // ── Guest progress helpers ─────────────────────────────────
  const getGuestProgress = () => {
    try {
      const raw = localStorage.getItem(GUEST_PROGRESS_KEY);
      return raw ? JSON.parse(raw) : { xp: 0, total_quizzes: 0, correct_answers: 0, streak: 0 };
    } catch {
      return { xp: 0, total_quizzes: 0, correct_answers: 0, streak: 0 };
    }
  };

  const saveGuestProgress = (progress) => {
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress));
  };

  const clearGuestProgress = () => {
    localStorage.removeItem(GUEST_PROGRESS_KEY);
  };

  const isLoggedIn = !!user;
  const isAdmin = user?.profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn,
        isAdmin,
        login,
        register,
        logout,
        updateUserProfile,
        guestUpgrade,
        loadUser,
        getGuestProgress,
        saveGuestProgress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Single source of truth on the frontend for "may bypass free-tier limits".
// Mirrors the backend hasUnlimitedAccess: admins always qualify, plus users with
// an active premium entitlement. Premium-only UI should gate on this hook so
// admins see and use every premium feature.
export function useHasUnlimitedAccess() {
  const { user, isAdmin } = useAuth();
  return isAdmin || user?.entitlement?.tier === 'premium';
}
