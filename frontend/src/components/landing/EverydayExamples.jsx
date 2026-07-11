import { MessageCircle } from 'lucide-react';
import SectionShell from '../ui/SectionShell.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import SectionTitle from '../ui/SectionTitle.jsx';
import Card from '../ui/Card.jsx';
import { t } from '../../i18n/index.js';

// Section 3 — Everyday examples (m4-rebrand.md §5.3). Chat-bubble scenario cards
// showing real, everyday lines where the loanword renders in accent-coral (§2).
// The tone is recognition, never correction — the closing line invites, it does
// not scold (§1). Surface: --surface-mint.

const CARD_INDEXES = [1, 2, 3];

// Wrap the loanword (its own key) in coral wherever it appears in the sentence —
// fail-soft if it isn't found (same technique as SectionTitle).
const highlightLoan = (text, loan) => {
  if (!loan) return text;
  const idx = text.indexOf(loan);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-black text-accent-coral">{loan}</span>
      {text.slice(idx + loan.length)}
    </>
  );
};

const ExampleCard = ({ context, text, loan }) => (
  <Card className="shadow-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-card-hover">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
        {context}
      </span>
    </div>
    <p className="mt-4 rounded-2xl rounded-tl-md bg-cloud px-4 py-3 text-base font-bold text-ink">
      {highlightLoan(text, loan)}
    </p>
  </Card>
);

const EverydayExamples = ({ id }) => {
  const cards = CARD_INDEXES.map((n) => ({
    key: n,
    context: t(`TODO_SQ_landing_examples_card${n}_context`),
    text: t(`TODO_SQ_landing_examples_card${n}_text`),
    loan: t(`TODO_SQ_landing_examples_card${n}_loan`),
  }));

  return (
    <SectionShell surface="mint" id={id}>
      <div className="flex flex-col items-center text-center">
        <Eyebrow>{t('TODO_SQ_landing_examples_eyebrow')}</Eyebrow>
        <SectionTitle
          className="mt-4"
          align="center"
          title={t('TODO_SQ_landing_examples_title')}
          accentWord={t('TODO_SQ_landing_examples_title_accent')}
          accent="coral"
          subline={t('TODO_SQ_landing_examples_subline')}
        />
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {cards.map(({ key, context, text, loan }) => (
          <ExampleCard key={key} context={context} text={text} loan={loan} />
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-xl text-center text-base font-semibold text-ink-soft">
        {t('TODO_SQ_landing_examples_closing')}
      </p>
    </SectionShell>
  );
};

export default EverydayExamples;
