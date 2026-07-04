import LegalPage, { LegalSection } from '../components/LegalPage.jsx';
import { t } from '../i18n/index.js';

// The Children's Privacy section (`children`) is rendered with a distinct highlight
// so it is unmistakably present — the age-gate / parental-consent posture Paddle and
// COPPA/GDPR-K reviewers look for. Its copy is TODO_SQ until Arbri fills it.
const SECTIONS = [
  { key: 'intro' },
  { key: 'dataCollected' },
  { key: 'dataUse' },
  { key: 'legalBasis' },
  { key: 'children', id: 'femijet', highlight: true },
  { key: 'sharing' },
  { key: 'retention' },
  { key: 'rights' },
  { key: 'security' },
  { key: 'contact' },
];

const Privacy = () => (
  <LegalPage
    seoTitle={t('legal.privacy.seoTitle')}
    seoDescription={t('legal.privacy.seoDesc')}
    path="/privatesia"
    title={t('legal.privacy.title')}
  >
    {SECTIONS.map(({ key, id, highlight }) =>
      highlight ? (
        <section
          key={key}
          id={id}
          className="scroll-mt-24 rounded-2xl border-2 border-fjalingo-green/30 bg-fjalingo-green/5 dark:bg-fjalingo-green/10 p-6"
        >
          <h2 className="text-xl md:text-2xl font-extrabold text-heading dark:text-dark-text mb-3">
            {t(`legal.privacy.sections.${key}.heading`)}
          </h2>
          <div className="text-body dark:text-dark-muted font-medium leading-relaxed whitespace-pre-line">
            {t(`legal.privacy.sections.${key}.body`)}
          </div>
        </section>
      ) : (
        <LegalSection key={key} id={id} heading={t(`legal.privacy.sections.${key}.heading`)}>
          {t(`legal.privacy.sections.${key}.body`)}
        </LegalSection>
      ),
    )}
  </LegalPage>
);

export default Privacy;
