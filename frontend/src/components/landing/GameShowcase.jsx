import { ArrowRight, Flame } from 'lucide-react';
import SectionShell from '../ui/SectionShell.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import SectionTitle from '../ui/SectionTitle.jsx';
import Card from '../ui/Card.jsx';
import { t } from '../../i18n/index.js';

// Section 4 — How the game works (m4-rebrand.md §5.4). Three step cards mapping
// the real loop: the borrowed word you already say → find the Albanian word →
// make it yours (XP/streak). Numbered markers are justified (a real sequence).
// Words inside the cards follow the coral (loan) / green (authentic) rule (§2).
// Paper surface; stays mounted in Home.jsx (reordering is RB-11).

// A subtle, geometric inline-SVG accent — token-coloured, decorative only (§5.4).
const CornerDecor = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 60 60"
    className="absolute right-3 top-3 h-12 w-12 text-brand-green/10"
  >
    <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="30" cy="30" r="16" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="30" cy="30" r="6" fill="currentColor" />
  </svg>
);

// The illustrative word-demo per step (the coral/green rule made concrete).
const StepDemo = ({ step, loan, albanian, rewardLabel }) => {
  if (step === 1) {
    return (
      <span className="inline-flex rounded-xl border-2 border-accent-coral/40 bg-accent-coral/10 px-3 py-1.5 text-sm font-black text-accent-coral">
        {loan}
      </span>
    );
  }
  if (step === 2) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-black">
        <span className="text-accent-coral line-through decoration-2">{loan}</span>
        <ArrowRight className="h-4 w-4 text-ink-soft" aria-hidden="true" />
        <span className="text-brand-green">{albanian}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Flame className="h-5 w-5 text-accent-coral" aria-hidden="true" />
      <span className="rounded-pill bg-accent-yellow/15 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-ink">
        +XP · {rewardLabel}
      </span>
    </span>
  );
};

const StepCard = ({ n, title, desc, demo }) => (
  <Card className="relative overflow-hidden shadow-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-card-hover">
    <CornerDecor />
    <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/15 text-base font-black text-brand-green">
      {n}
    </span>
    <h3 className="relative mt-4 text-lg font-black text-ink">{title}</h3>
    <p className="relative mt-2 text-sm font-semibold text-ink-soft">{desc}</p>
    <div className="relative mt-4">{demo}</div>
  </Card>
);

const GameShowcase = ({ id }) => {
  const loan = t('TODO_SQ_landing_how_word_loan');
  const albanian = t('TODO_SQ_landing_how_word_albanian');
  const rewardLabel = t('TODO_SQ_landing_how_reward_label');

  const steps = [1, 2, 3].map((n) => ({
    n,
    title: t(`TODO_SQ_landing_how_step${n}_title`),
    desc: t(`TODO_SQ_landing_how_step${n}_desc`),
    demo: (
      <StepDemo step={n} loan={loan} albanian={albanian} rewardLabel={rewardLabel} />
    ),
  }));

  return (
    <SectionShell surface="paper" id={id}>
      <div className="flex flex-col items-center text-center">
        <Eyebrow>{t('TODO_SQ_landing_how_eyebrow')}</Eyebrow>
        <SectionTitle
          className="mt-4"
          align="center"
          title={t('TODO_SQ_landing_how_title')}
          accentWord={t('TODO_SQ_landing_how_title_accent')}
          accent="green"
          subline={t('TODO_SQ_landing_how_subline')}
        />
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map(({ n, title, desc, demo }) => (
          <StepCard key={n} n={n} title={title} desc={desc} demo={demo} />
        ))}
      </div>
    </SectionShell>
  );
};

export default GameShowcase;
