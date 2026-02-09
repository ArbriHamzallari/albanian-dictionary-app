import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from './ThemeToggle.jsx';
import Avatar from './Avatar.jsx';
import NotificationBell from './NotificationBell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isLoggedIn, isAdmin, user, logout } = useAuth();

  const navLinks = [
    { to: '/', label: 'Kryefaqja' },
    { to: '/kuizi', label: 'Kuizi' },
    { to: '/arritjet', label: 'Arritjet' },
    { to: '/renditja', label: 'Renditja' },
    { to: '/propozo', label: 'Propozo Fjalë' },
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
              Mëso shqipen autentike
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
              <NavLink to={isAdmin ? '/admin/dashboard' : '/dashboard'} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-fjalingo-green/5 transition">
                <Avatar filename={user?.profile?.avatar_filename} size={28} />
                <span className="text-sm font-bold text-heading dark:text-dark-text">
                  {isAdmin ? 'Admin' : (user?.profile?.username || 'Dashboard')}
                </span>
              </NavLink>
              <button
                onClick={logout}
                className="p-2 rounded-xl hover:bg-card dark:hover:bg-dark-card transition text-muted hover:text-fjalingo-red"
                title="Dil"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <NavLink
              to="/hyr"
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  isActive
                    ? 'text-fjalingo-green bg-fjalingo-green/10'
                    : 'text-heading dark:text-dark-text hover:text-fjalingo-green hover:bg-fjalingo-green/5'
                }`
              }
            >
              Hyr
            </NavLink>
          )}

          <ThemeToggle />
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl hover:bg-card dark:hover:bg-dark-card transition-colors"
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
                  {isAdmin ? 'Admin Panel' : 'Dashboard'}
                </NavLink>
                <NotificationBell />
              </div>
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="block w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-fjalingo-red hover:bg-fjalingo-red/5"
              >
                Dil
              </button>
            </>
          ) : (
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
              Hyr
            </NavLink>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;
