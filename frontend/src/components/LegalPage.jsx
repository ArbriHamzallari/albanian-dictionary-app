import Seo from './Seo.jsx';
import { t } from '../i18n/index.js';

// Shared shell for the Albanian legal pages (Terms, Privacy, Refund, Contact).
// Presentational only: SEO head + a readable, dark-aware prose column. The actual
// Albanian copy lives in sq.json (TODO_SQ_* until Arbri fills it). Uses the
// heading/dark-text token pairs (not ui/Card's light-only ink/paper tokens) so the
// pages hold contrast in both themes (UX-5).
const LegalPage = ({ seoTitle, seoDescription, path, title, children }) => (
  <div className="max-w-3xl mx-auto px-6 py-12">
    <Seo title={seoTitle} description={seoDescription} path={path} />
    <h1 className="text-3xl md:text-4xl font-black text-heading dark:text-dark-text mb-2">
      {title}
    </h1>
    <p className="text-sm font-semibold text-muted dark:text-dark-muted mb-10">
      {t('legal.updated')}
    </p>
    <div className="space-y-8">{children}</div>
  </div>
);

// One legal section: a heading plus prose. `whitespace-pre-line` lets Arbri paste
// multi-paragraph copy with newlines and have it render. `id` enables anchor links
// (e.g. the Refund page links to the refund section inside Terms).
export const LegalSection = ({ id, heading, children }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="text-xl md:text-2xl font-extrabold text-heading dark:text-dark-text mb-3">
      {heading}
    </h2>
    <div className="text-body dark:text-dark-muted font-medium leading-relaxed whitespace-pre-line">
      {children}
    </div>
  </section>
);

// Operator legal identity. The name (Arbri Hamzallari) and brand (Fjalingo) are
// literal facts given in the task; only the Albanian role descriptor is a TODO
// placeholder for Arbri to confirm.
export const OperatorLine = ({ className = '' }) => (
  <span className={className}>Fjalingo — Arbri Hamzallari, {t('legal.operatorRole')}</span>
);

export default LegalPage;
