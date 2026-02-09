import { NavLink } from 'react-router-dom';
import { Home, Search, Gamepad2, Trophy, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const MobileNav = () => {
  const { isLoggedIn, isAdmin } = useAuth();

  const dashboardPath = isAdmin ? '/admin/dashboard' : '/dashboard';

  const tabs = [
    { to: '/', icon: Home, label: 'Kreu' },
    { to: '/kerko', icon: Search, label: 'Kërko' },
    { to: '/kuizi', icon: Gamepad2, label: 'Kuiz' },
    { to: '/renditja', icon: Trophy, label: 'Renditja' },
    { to: isLoggedIn ? dashboardPath : '/hyr', icon: User, label: isAdmin ? 'Admin' : (isLoggedIn ? 'Profili' : 'Hyr') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-dark-bg border-t-2 border-border dark:border-dark-border">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 px-3 min-w-[64px] transition-colors ${
                isActive
                  ? 'text-fjalingo-green'
                  : 'text-muted dark:text-dark-muted'
              }`
            }
          >
            <tab.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
