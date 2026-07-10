import { NavLink } from 'react-router-dom';
import { Compass, Gamepad2, Trophy, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { t } from '../i18n/index.js';

const MobileNav = () => {
  const { isLoggedIn } = useAuth();

  const tabs = [
    { to: '/origjina', icon: Compass, label: t('TODO_SQ_nav_rruga') },
    { to: '/kuizi', icon: Gamepad2, label: t('TODO_SQ_nav_luaj') },
    { to: '/renditja', icon: Trophy, label: t('TODO_SQ_nav_renditja') },
    { to: isLoggedIn ? '/profili' : '/hyr', icon: User, label: isLoggedIn ? t('TODO_SQ_nav_profili') : t('common.login') },
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
