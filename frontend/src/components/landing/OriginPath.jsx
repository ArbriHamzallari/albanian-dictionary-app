import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionShell from '../ui/SectionShell.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import SectionTitle from '../ui/SectionTitle.jsx';
import StatChip from '../ui/StatChip.jsx';
import { t } from '../../i18n/index.js';

// Section 6 — the origin journey (m4-rebrand.md §5.6). A shelf of collectible chapter
// cards, one per origin from /public/origins: accent chip (era), name_sq, live
// word_count (StatChip), link to /origjina/:code. Fixed landing order; anglisht is the
// free world. Each origin gets ONE stable accent from existing tokens (no new colours).

const LANDING_ORDER = ['anglisht', 'turqisht', 'neolatine', 'greqisht', 'sllavisht'];

// code -> stable token treatment. `stat` maps to a StatChip accent (AA-safe on paper).
const ORIGIN_ACCENT = {
  anglisht: { chip: 'bg-brand-green/12 text-brand-green', bar: 'bg-brand-green', stat: 'green' },
  turqisht: { chip: 'bg-accent-coral/15 text-accent-coral', bar: 'bg-accent-coral', stat: 'coral' },
  neolatine: { chip: 'bg-accent-yellow/20 text-ink', bar: 'bg-accent-yellow', stat: 'ink' },
  greqisht: { chip: 'bg-accent-purple/12 text-accent-purple', bar: 'bg-accent-purple', stat: 'purple' },
  sllavisht: { chip: 'bg-ink/10 text-ink', bar: 'bg-ink/40', stat: 'ink' },
};
const DEFAULT_ACCENT = { chip: 'bg-ink/10 text-ink', bar: 'bg-ink/40', stat: 'ink' };

const ChapterCard = ({ origin }) => {
  const accent = ORIGIN_ACCENT[origin.code] ?? DEFAULT_ACCENT;
  return (
    <Link
      to={`/origjina/${origin.code}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-card-hover"
    >
      <span className={`h-1.5 w-full ${accent.bar}`} aria-hidden="true" />
      <div className="flex flex-1 flex-col p-5">
        {origin.era_sq && (
          <span
            className={`self-start rounded-pill px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide ${accent.chip}`}
          >
            {origin.era_sq}
          </span>
        )}
        <h3 className="mt-3 text-lg font-black text-ink sm:text-xl">{origin.name_sq}</h3>
        <div className="mt-auto flex items-end justify-between pt-6">
          <StatChip value={origin.word_count} label={t('home.path.wordsLabel')} accent={accent.stat} />
          <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-green">
            {t('home.path.open')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
};

const SkeletonCard = () => (
  // Mirrors ChapterCard dimensions so nothing shifts when data arrives (spec §5.6).
  <div className="flex flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-card">
    <span className="h-1.5 w-full bg-line" aria-hidden="true" />
    <div className="p-5">
      <div className="h-5 w-20 animate-pulse rounded-pill bg-line" />
      <div className="mt-3 h-6 w-32 animate-pulse rounded bg-line" />
      <div className="mt-6 flex items-end justify-between">
        <div className="h-[3.75rem] w-24 animate-pulse rounded-2xl bg-line" />
        <div className="h-4 w-12 animate-pulse rounded bg-line" />
      </div>
    </div>
  </div>
);

const OriginPath = ({ origins, loading }) => {
  const byCode = new Map((origins || []).map((o) => [o.code, o]));
  const ordered = LANDING_ORDER.map((code) => byCode.get(code)).filter(Boolean);

  return (
    <SectionShell surface="paper" id="rruga" className="scroll-mt-20">
      <div className="flex flex-col items-center text-center">
        <Eyebrow>{t('home.path.eyebrow')}</Eyebrow>
        <SectionTitle
          className="mt-4"
          align="center"
          title={t('home.path.heading')}
          accentWord="historinë"
          accent="green"
          subline={t('home.path.lead')}
        />
      </div>

      {!loading && ordered.length === 0 ? (
        <p className="mt-12 text-center text-base font-semibold text-ink-soft">
          {t('TODO_SQ_landing_origins_empty')}
        </p>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? LANDING_ORDER.map((code) => <SkeletonCard key={code} />)
            : ordered.map((origin) => <ChapterCard key={origin.code} origin={origin} />)}
        </div>
      )}
    </SectionShell>
  );
};

export default OriginPath;
