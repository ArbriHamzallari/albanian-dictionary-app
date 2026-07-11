import { useReducedMotion } from 'framer-motion';

// Restrained hero atmosphere (m4-rebrand.md §5.1, §10). Soft brand-tinted blobs
// + a faint dotted grid, built from brand/surface tokens ONLY — no blue, no
// stock art (spec §2, §3.10). Purely decorative; the float drops under
// prefers-reduced-motion (the blobs stay as static wash).
const HeroBackground = () => {
  const reduceMotion = useReducedMotion();
  const float = (value) => (reduceMotion ? undefined : value);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute -left-10 -top-16 h-72 w-72 rounded-full blur-3xl opacity-[0.22] dark:opacity-[0.14]"
        style={{
          background: 'radial-gradient(circle, var(--brand-green), transparent 70%)',
          animation: float('blobFloat1 32s ease-in-out infinite'),
        }}
      />
      <div
        className="absolute -right-12 top-8 h-80 w-80 rounded-full blur-3xl opacity-[0.16] dark:opacity-[0.10]"
        style={{
          background: 'radial-gradient(circle, var(--accent-yellow), transparent 70%)',
          animation: float('blobFloat2 38s ease-in-out infinite'),
        }}
      />
      <div
        className="absolute -bottom-16 left-1/3 h-72 w-72 rounded-full blur-3xl opacity-[0.14] dark:opacity-[0.10]"
        style={{
          background: 'radial-gradient(circle, var(--accent-coral), transparent 70%)',
          animation: float('blobFloat3 28s ease-in-out infinite'),
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(var(--brand-green) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
    </div>
  );
};

export default HeroBackground;
