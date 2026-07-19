import { Link } from 'react-router-dom';
import { Instagram, Globe, Linkedin } from 'lucide-react';
import Parrot from './mascot/Parrot.jsx';
import { OperatorLine } from './LegalPage.jsx';
import { t } from '../i18n/index.js';

// Shared footer, elevated for M4 (m4-rebrand.md §5, row 12): a permanently DARK surface
// on every page. Uses the fixed dark.* tokens (they don't flip with theme) + brand-green
// accents; migrated off the legacy fjalingo-* aliases.
const navLinkClass =
  'text-sm font-semibold text-dark-muted hover:text-brand-green transition-colors';

const NAV_LINKS = [
  { to: '/', key: 'nav.home' },
  { to: '/kuizi', key: 'nav.quiz' },
  { to: '/arritjet', key: 'nav.achievements' },
  { to: '/propozo', key: 'nav.suggest' },
  { to: '/premium', key: 'nav.pricing' },
];

const LEGAL_LINKS = [
  { to: '/kushtet', key: 'footer.links.terms' },
  { to: '/privatesia', key: 'footer.links.privacy' },
  { to: '/rimbursimi', key: 'footer.links.refund' },
  { to: '/kontakt', key: 'footer.links.contact' },
  { to: '/en', key: 'footer.links.english' },
];

const SOCIALS = [
  { href: 'https://www.instagram.com/fjalingo.app/', icon: Instagram, aria: 'footer.instagramAria' },
  { href: 'https://codrixwebsite.vercel.app/', icon: Globe, aria: 'footer.websiteAria' },
  { href: 'https://www.linkedin.com/company/codrix-solutions/', icon: Linkedin, aria: 'footer.linkedinAria' },
];

const Footer = () => (
  <footer className="mt-auto border-t border-dark-border bg-dark-bg text-dark-muted">
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-8 md:grid-cols-4">
        {/* Brand */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Parrot state="idle" size={28} />
            <span className="text-xl font-black text-brand-green">Fjalingo</span>
          </div>
          <p className="text-sm font-semibold text-dark-muted">{t('footer.tagline')}</p>
        </div>

        {/* Product */}
        <div>
          <h4 className="mb-3 font-bold text-dark-text">{t('footer.navHeading')}</h4>
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map(({ to, key }) => (
              <Link key={to} to={to} className={navLinkClass}>
                {t(key)}
              </Link>
            ))}
          </div>
        </div>

        {/* Contact + social */}
        <div>
          <h4 className="mb-3 font-bold text-dark-text">{t('footer.contactHeading')}</h4>
          <p className="text-sm font-semibold text-dark-muted">fjalingo.al@gmail.com</p>
          <div className="mt-4 flex items-center gap-4">
            {SOCIALS.map(({ href, icon: Icon, aria }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={t(aria)}
                className="text-dark-muted transition-colors hover:text-brand-green"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        {/* Legal (LEGAL-1) — Terms, Privacy and Refund reachable from every page. */}
        <div>
          <h4 className="mb-3 font-bold text-dark-text">{t('footer.legalHeading')}</h4>
          <div className="flex flex-col gap-2">
            {LEGAL_LINKS.map(({ to, key }) => (
              <Link key={to} to={to} className={navLinkClass}>
                {t(key)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-dark-border pt-6 text-center">
        <OperatorLine className="mb-1 block text-xs font-semibold text-dark-muted" />
        <p className="text-xs font-semibold text-dark-muted">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
