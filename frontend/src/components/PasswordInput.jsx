import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { t } from '../i18n/index.js';

// A password <input> with a show/hide eye toggle. Drop-in replacement for a
// plain password input: pass the same props (value, onChange, className, etc.).
// The toggle only swaps the input type, so there is no layout shift, and the
// button is a real <button> so it is keyboard-operable (Tab + Space/Enter).
const PasswordInput = ({ className = '', ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('common.field.hidePassword') : t('common.field.showPassword')}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 rounded-r-2xl text-muted hover:text-heading dark:text-dark-muted dark:hover:text-dark-text focus:outline-none focus-visible:ring-2 focus-visible:ring-fjalingo-green"
      >
        {visible ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
      </button>
    </div>
  );
};

export default PasswordInput;
