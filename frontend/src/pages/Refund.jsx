import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '../components/LegalPage.jsx';
import { t } from '../i18n/index.js';

// Short standalone page (Paddle requires a clearly accessible refund policy). The
// substantive terms live in the Terms refund section; this page states the EU 14-day
// withdrawal position and deep-links to it.
const Refund = () => (
  <LegalPage
    seoTitle={t('legal.refund.seoTitle')}
    seoDescription={t('legal.refund.seoDesc')}
    path="/rimbursimi"
    title={t('legal.refund.title')}
  >
    <LegalSection heading={t('legal.refund.sections.policy.heading')}>
      {t('legal.refund.sections.policy.body')}
    </LegalSection>
    <LegalSection heading={t('legal.refund.sections.howTo.heading')}>
      {t('legal.refund.sections.howTo.body')}
    </LegalSection>

    <Link
      to="/kushtet#rimbursimi"
      className="inline-block font-bold text-fjalingo-green hover:text-fjalingo-green-dark transition-colors"
    >
      {t('legal.refund.termsLink')} →
    </Link>
  </LegalPage>
);

export default Refund;
