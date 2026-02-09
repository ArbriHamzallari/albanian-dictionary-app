import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getTheme, setTheme } from '../utils/userService.js';

const ThemeToggle = () => {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(getTheme() === 'dark');
  }, []);

  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    setTheme(next);
    setDark(!dark);
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl hover:bg-card dark:hover:bg-dark-card transition-colors"
      aria-label={dark ? 'Aktivizo dritën' : 'Aktivizo errësirën'}
    >
      {dark ? (
        <Sun className="w-5 h-5 text-fjalingo-yellow" />
      ) : (
        <Moon className="w-5 h-5 text-muted" />
      )}
    </button>
  );
};

export default ThemeToggle;
