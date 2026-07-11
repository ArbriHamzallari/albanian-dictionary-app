// StatChip — a small collectible chip for a live stat (word counts, homepage
// proof band; m4-rebrand.md §5.6, §5.7). The `loading` state renders a
// fixed-size skeleton so async numbers never cause layout shift (§7.7).
// Accents are limited to tokens that hold contrast for large bold text on
// paper; the neutral `ink` default always passes.

const ACCENTS = {
  ink: 'text-ink',
  green: 'text-brand-green',
  coral: 'text-accent-coral',
  purple: 'text-accent-purple',
};

const StatChip = ({
  value,
  label,
  accent = 'ink',
  loading = false,
  className = '',
}) => {
  const accentClass = ACCENTS[accent] ?? ACCENTS.ink;

  return (
    <div
      className={[
        'inline-flex min-w-[104px] flex-col items-center rounded-2xl border border-line',
        'bg-paper px-5 py-3 text-center shadow-card',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <span
          className="my-0.5 h-6 w-14 animate-pulse rounded-md bg-line"
          aria-hidden="true"
        />
      ) : (
        <span className={['text-2xl font-black leading-none', accentClass].join(' ')}>
          {value}
        </span>
      )}
      <span className="mt-1 text-xs font-bold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
    </div>
  );
};

export default StatChip;
