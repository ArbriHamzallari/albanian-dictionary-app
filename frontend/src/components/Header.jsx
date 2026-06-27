import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import ThemeToggle from './ThemeToggle.jsx';
import Avatar from './Avatar.jsx';
import NotificationBell from './NotificationBell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { t } from '../i18n/index.js';

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const location = useLocation();
  const { isLoggedIn, isAdmin, user, logout } = useAuth();

  // Close the account dropdown on outside-click, Esc, or route change.
  useEffect(() => {
    if (!accountOpen) return undefined;
    const onPointer = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setAccountOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  useEffect(() => { setAccountOpen(false); }, [location]);

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/kuizi', label: t('nav.quiz') },
    { to: '/arritjet', label: t('nav.achievements') },
    { to: '/renditja', label: t('nav.leaderboard') },
    ...(isLoggedIn && !isAdmin ? [
      { to: '/miqte', label: t('nav.friends') },
      { to: '/bisedat', label: t('nav.chats') },
    ] : []),
    { to: '/premium', label: t('nav.premium') },
    { to: '/propozo', label: t('nav.suggest') },
  ];

  return (
    <header className="bg-white dark:bg-dark-bg border-b-2 border-border dark:border-dark-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 group">
          <span className="text-3xl">🦅</span>
          <div>
            <h1 className="text-2xl font-black font-display text-fjalingo-green leading-none">
              Fjalingo
            </h1>
            <p className="text-[10px] font-semibold text-muted dark:text-dark-muted leading-tight hidden sm:block">
              {t('header.tagline')}
            </p>
          </div>
        </NavLink>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  isActive
                    ? 'text-fjalingo-green bg-fjalingo-green/10'
                    : 'text-heading dark:text-dark-text hover:text-fjalingo-green hover:bg-fjalingo-green/5'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          {isLoggedIn ? (
            <div className="flex items-center gap-2 ml-2">
              <NotificationBell />
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-fjalingo-green/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fjalingo-green"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  aria-label={t('header.accountMenu')}
                >
                  <Avatar filename={user?.profile?.avatar_filename} size={28} />
                  <span className="text-sm font-bold text-heading dark:text-dark-text">
                    {isAdmin ? t('common.admin') : (user?.profile?.username || t('header.dashboard'))}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted transition-transform ${accountOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {accountOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-48 rounded-xl border-2 border-border dark:border-dark-border bg-white dark:bg-dark-bg shadow-lg py-1">
                    {isAdmin ? (
                      <NavLink to="/admin/dashboard" role="menuitem" className="block px-4 py-2.5 text-sm font-bold text-heading dark:text-dark-text hover:bg-fjalingo-green/5">
                        {t('header.adminPanel')}
                      </NavLink>
                    ) : (
                      <>
                        <NavLink to="/profili" role="menuitem" className="block px-4 py-2.5 text-sm font-bold text-heading dark:text-dark-text hover:bg-fjalingo-green/5">
                          {t('header.profile')}
                        </NavLink>
                        <NavLink to="/dashboard" role="menuitem" className="block px-4 py-2.5 text-sm font-bold text-heading dark:text-dark-text hover:bg-fjalingo-green/5">
                          {t('header.dashboard')}
                        </NavLink>
                      </>
                    )}
                    <button
                      onClick={() => { setAccountOpen(false); logout(); }}
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-fjalingo-red hover:bg-fjalingo-red/5"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      {t('common.logout')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <NavLink
                to="/hyr"
                className="px-4 py-2 rounded-xl text-sm font-bold border-2 border-fjalingo-green text-fjalingo-green hover:bg-fjalingo-green/5 transition-colors"
              >
                {t('common.login')}
              </NavLink>
              <NavLink
                to="/regjistrohu"
                className="px-4 py-2 rounded-xl text-sm font-bold bg-fjalingo-green text-white hover:opacity-90 transition-opacity"
              >
                {t('header.register')}
              </NavLink>
            </div>
          )}

          <ThemeToggle />
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl hover:bg-card dark:hover:bg-dark-card transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-fjalingo-green"
            aria-label={mobileOpen ? t('header.closeMenu') : t('header.openMenu')}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border dark:border-dark-border bg-white dark:bg-dark-bg px-4 pb-4">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  isActive
                    ? 'text-fjalingo-green bg-fjalingo-green/10'
                    : 'text-heading dark:text-dark-text hover:text-fjalingo-green'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          {isLoggedIn ? (
            <>
              <div className="flex items-center justify-between px-4 py-3">
                <NavLink
                  to={isAdmin ? '/admin/dashboard' : '/dashboard'}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-xl text-sm font-bold text-heading dark:text-dark-text hover:text-fjalingo-green"
                >
                  <Avatar filename={user?.profile?.avatar_filename} size={24} />
                  {isAdmin ? t('header.adminPanel') : t('header.dashboard')}
                </NavLink>
                <NotificationBell />
              </div>
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="block w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-fjalingo-red hover:bg-fjalingo-red/5"
              >
                {t('common.logout')}
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/hyr"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                    isActive
                      ? 'text-fjalingo-green bg-fjalingo-green/10'
                      : 'text-heading dark:text-dark-text hover:text-fjalingo-green'
                  }`
                }
              >
                {t('common.login')}
              </NavLink>
              <NavLink
                to="/regjistrohu"
                onClick={() => setMobileOpen(false)}
                className="mt-1 block px-4 py-3 rounded-xl text-sm font-bold bg-fjalingo-green text-white hover:opacity-90 transition-opacity"
              >
                {t('header.register')}
              </NavLink>
            </>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;
