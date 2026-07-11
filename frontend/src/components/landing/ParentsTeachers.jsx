import { useReducedMotion } from 'framer-motion';
import { Users, GraduationCap, Check, ArrowRight } from 'lucide-react';
import SectionShell from '../ui/SectionShell.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import SectionTitle from '../ui/SectionTitle.jsx';
import Card from '../ui/Card.jsx';
import Parrot from '../mascot/Parrot.jsx';
import { t } from '../../i18n/index.js';

// Section 8 — Parents & teachers (m4-rebrand.md §5.8, tone §1). Two calm cards
// (families / classrooms), honest product facts, and an inline link down to the
// safety section. Warm and reassuring, never pressuring. Paper surface. The parrot
// appears once (wave = welcoming — no "pointing" state exists in Parrot.jsx).

// The safety section (TrustCards) gets id="siguria" in RB-9; this link is a no-op
// until both are mounted together in RB-11.
const SAFETY_ANCHOR = 'siguria';

const CHIP = {
  green: 'bg-brand-green/10 text-brand-green',
  yellow: 'bg-accent-yellow/15 text-accent-yellow',
};

const CalmCard = ({ icon: Icon, accent, title, desc }) => (
  <Card className="shadow-card">
    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${CHIP[accent]}`}>
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
    <h3 className="mt-4 text-lg font-black text-ink">{t(title)}</h3>
    <p className="mt-2 text-sm font-semibold text-ink-soft">{t(desc)}</p>
  </Card>
);

const FactPill = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-paper px-3 py-1.5 text-xs font-bold text-ink-soft">
    <Check className="h-3.5 w-3.5 text-brand-green" aria-hidden="true" />
    {children}
  </span>
);

const ParentsTeachers = ({ id }) => {
  const reduceMotion = useReducedMotion();

  const scrollToSafety = (e) => {
    const el = document.getElementById(SAFETY_ANCHOR);
    if (!el) return; // no-JS / not-yet-mounted: href="#siguria" still jumps
    e.preventDefault();
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <SectionShell surface="paper" id={id}>
      <div className="flex flex-col items-center text-center">
        <Parrot state="wave" size={104} />
        <Eyebrow className="mt-3">{t('TODO_SQ_landing_parents_eyebrow')}</Eyebrow>
        <SectionTitle
          className="mt-4"
          align="center"
          title={t('TODO_SQ_landing_parents_title')}
          accentWord={t('TODO_SQ_landing_parents_title_accent')}
          accent="green"
          subline={t('TODO_SQ_landing_parents_subline')}
        />
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <CalmCard
          icon={Users}
          accent="green"
          title="TODO_SQ_landing_parents_families_title"
          desc="TODO_SQ_landing_parents_families_desc"
        />
        <CalmCard
          icon={GraduationCap}
          accent="yellow"
          title="TODO_SQ_landing_parents_classrooms_title"
          desc="TODO_SQ_landing_parents_classrooms_desc"
        />
      </div>

      <div className="mt-10 flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-2">
          <FactPill>{t('TODO_SQ_landing_parents_fact_ads')}</FactPill>
          <FactPill>{t('TODO_SQ_landing_parents_fact_hearts')}</FactPill>
          <FactPill>{t('TODO_SQ_landing_parents_fact_safe')}</FactPill>
        </div>
        <a
          href={`#${SAFETY_ANCHOR}`}
          onClick={scrollToSafety}
          className="inline-flex items-center gap-1 text-sm font-bold text-brand-green underline-offset-4 hover:underline"
        >
          {t('TODO_SQ_landing_parents_safety_link')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </SectionShell>
  );
};

export default ParentsTeachers;
