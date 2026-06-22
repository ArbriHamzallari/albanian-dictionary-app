import { motion, useReducedMotion } from 'framer-motion';

const VARIANTS = {
  primary: {
    bg: 'bg-brand-green',
    text: 'text-paper',
    shadow: 'shadow-[0_3px_0_0_var(--brand-green-dark)]',
    activeShadow: 'shadow-none',
    hover: 'hover:brightness-105',
  },
  secondary: {
    bg: 'bg-paper',
    text: 'text-ink',
    shadow: 'shadow-[0_3px_0_0_var(--line)]',
    activeShadow: 'shadow-none',
    hover: 'hover:bg-cloud',
    border: 'border-2 border-line',
  },
  ghost: {
    bg: 'bg-transparent',
    text: 'text-brand-green',
    shadow: '',
    activeShadow: '',
    hover: 'hover:bg-brand-green/10',
  },
  danger: {
    bg: 'bg-accent-coral',
    text: 'text-paper',
    shadow: 'shadow-[0_3px_0_0_color-mix(in_srgb,var(--accent-coral)_75%,var(--ink))]',
    activeShadow: 'shadow-none',
    hover: 'hover:brightness-105',
  },
};

const SIZES = {
  md: 'h-14 md:h-[56px] px-8 text-base',
  lg: 'h-14 md:h-[60px] px-10 text-lg',
};

const SPRING = { type: 'spring', stiffness: 300, damping: 22 };

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...rest
}) => {
  const reduceMotion = useReducedMotion();
  const styles = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      whileTap={reduceMotion || isDisabled ? undefined : { scale: 0.95, y: 3 }}
      transition={SPRING}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold',
        'transition-[box-shadow,transform] duration-100 ease-out',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cloud',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none',
        'active:translate-y-[3px]',
        styles.bg,
        styles.text,
        styles.shadow,
        styles.hover,
        styles.border,
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading && (
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </motion.button>
  );
};

export default Button;
