import LegalPage, { LegalSection, OperatorLine } from '../components/LegalPage.jsx';
import { t } from '../i18n/index.js';

// Section keys map to legal.terms.sections.<key>.{heading,body} in sq.json.
// The refund section carries an anchor id so /rimbursimi can deep-link to it.
const SECTIONS = [
  { key: 'intro' },
  { key: 'eligibility' },
  { key: 'account' },
  { key: 'acceptableUse' },
  { key: 'subscription' },
  { key: 'refund', id: 'rimbursimi' },
  { key: 'liability' },
  { key: 'changes' },
  { key: 'law' },
  { key: 'contact' },
];

const Terms = () => (
  <LegalPage
    seoTitle={t('legal.terms.seoTitle')}
    seoDescription={t('legal.terms.seoDesc')}
    path="/kushtet"
    title={t('legal.terms.title')}
  >
    {SECTIONS.map(({ key, id }) => (
      <LegalSection key={key} id={id} heading={t(`legal.terms.sections.${key}.heading`)}>
        {t(`legal.terms.sections.${key}.body`)}
      </LegalSection>
    ))}

    <section className="pt-6 border-t border-border dark:border-dark-border">
      <h2 className="text-xl md:text-2xl font-extrabold text-heading dark:text-dark-text mb-3">
        {t('legal.terms.operatorHeading')}
      </h2>
      <OperatorLine className="text-body dark:text-dark-muted font-semibold" />
    </section>
  </LegalPage>
);

export default Terms;
