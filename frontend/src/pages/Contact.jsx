import LegalPage, { LegalSection, OperatorLine } from '../components/LegalPage.jsx';
import { t } from '../i18n/index.js';

// The contact point Paddle requires: a reachable email plus the operator's legal
// identity. The email matches the one in the footer.
const CONTACT_EMAIL = 'fjalingo.al@gmail.com';

const Contact = () => (
  <LegalPage
    seoTitle={t('legal.contact.seoTitle')}
    seoDescription={t('legal.contact.seoDesc')}
    path="/kontakt"
    title={t('legal.contact.title')}
  >
    <p className="text-body dark:text-dark-muted font-medium leading-relaxed whitespace-pre-line">
      {t('legal.contact.intro')}
    </p>

    <LegalSection heading={t('legal.contact.emailHeading')}>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="font-bold text-fjalingo-green hover:text-fjalingo-green-dark transition-colors"
      >
        {CONTACT_EMAIL}
      </a>
    </LegalSection>

    <LegalSection heading={t('legal.contact.operatorHeading')}>
      <OperatorLine />
    </LegalSection>
  </LegalPage>
);

export default Contact;
