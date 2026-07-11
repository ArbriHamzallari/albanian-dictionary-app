// SectionTitle — the large rounded headline (max two lines) with optional
// subline (m4-rebrand.md §3.2, §3.7). Supports rendering exactly ONE accent
// word: the loan/authentic rule means green for the Albanian word, coral for a
// loanword. Display weight 800–900, text-balance, clamp-sized.

const ACCENTS = {
  green: 'text-brand-green',
  coral: 'text-accent-coral',
  purple: 'text-accent-purple', // premium surfaces only (spec §2)
};

// Split the headline around the FIRST occurrence of accentWord and colour only
// that one span — everything else stays ink. If the word isn't found, the
// headline renders plainly (fail-soft, never throws).
const renderHeadline = (title, accentWord, accentClass) => {
  if (!accentWord) return title;
  const idx = title.indexOf(accentWord);
  if (idx === -1) return title;
  return (
    <>
      {title.slice(0, idx)}
      <span className={accentClass}>{accentWord}</span>
      {title.slice(idx + accentWord.length)}
    </>
  );
};

const SectionTitle = ({
  title,
  accentWord,
  accent = 'green',
  subline,
  id,
  align = 'left',
  as: Tag = 'h2',
  className = '',
}) => {
  const accentClass = ACCENTS[accent] ?? ACCENTS.green;
  const alignClass = align === 'center' ? 'mx-auto text-center' : '';

  return (
    <div className={['max-w-2xl', alignClass, className].filter(Boolean).join(' ')}>
      <Tag
        id={id}
        className="text-balance text-3xl font-black leading-tight text-ink sm:text-4xl md:text-[clamp(2rem,4vw,3rem)]"
      >
        {renderHeadline(title, accentWord, accentClass)}
      </Tag>
      {subline && (
        <p className="mt-4 text-base font-semibold text-ink-soft sm:text-lg">
          {subline}
        </p>
      )}
    </div>
  );
};

export default SectionTitle;
