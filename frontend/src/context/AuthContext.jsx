import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'fjalingo_token';
const GUEST_PROGRESS_KEY = 'fjalingo_guest_progress';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { profile, stats, rank, achievements }
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY));

  const setToken = useCallback((t) => {
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setTokenState(t);
  }, []);

  // Load user profile from /auth/me when token exists
  const loadUser = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      setUser(res.data);
    } catch (err) {
      // Clear token only when it's truly invalid/expired.
      if (err?.response?.status === 401) {
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [setToken]);

  useEffect(() => {
    loadUser();
  }, [loadUser, token]);

  // ── Actions ────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.data.token);
    if (res.data.profile) {
      setUser({
        profile: res.data.profile,
        stats: res.data.stats || null,
        rank: res.data.rank ?? null,
        achievements: res.data.achievements || [],
      });
    }
    // Return role explicitly so callers can redirect admin users
    return { ...res.data, role: res.data.role || res.data.profile?.role || 'user' };
  };

  const register = async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    setToken(res.data.token);
    if (res.data.profile) {
      setUser({
        profile: res.data.profile,
        stats: res.data.stats || null,
        rank: res.data.rank ?? null,
        achievements: res.data.achievements || [],
      });
    }
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    // Clean up legacy admin token key if it exists
    localStorage.removeItem('auth_token');
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

  const guestUpgrade = async (username, email, password) => {
    const guestProgress = getGuestProgress();
    const res = await api.post('/auth/guest-upgrade', {
      username,
      email,
      password,
      guestProgress,
    });
    clearGuestProgress();
    setToken(res.data.token);
    if (res.data.profile) {
      setUser({
        profile: res.data.profile,
        stats: res.data.stats || null,
        rank: res.data.rank ?? null,
        achievements: res.data.achievements || [],
      });
    }
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

  const isLoggedIn = !!user && !!token;
  const isAdmin = user?.profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
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
