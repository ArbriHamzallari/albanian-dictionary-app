// Eyebrow — the small uppercase pill that opens a section (m4-rebrand.md §3.2).
// Uppercase, 700, small; brand-green on a soft green tint. One per section.

const Eyebrow = ({ children, className = '' }) => (
  <span
    className={[
      'inline-flex items-center rounded-pill bg-brand-green/10 px-3 py-1',
      'text-xs font-bold uppercase tracking-widest text-brand-green',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </span>
);

export default Eyebrow;
