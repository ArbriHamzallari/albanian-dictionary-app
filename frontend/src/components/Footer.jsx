import { Link } from 'react-router-dom';
import { Instagram, Globe, Linkedin } from 'lucide-react';
import Parrot from './mascot/Parrot.jsx';
import { OperatorLine } from './LegalPage.jsx';
import { t } from '../i18n/index.js';

const legalLinkClass =
  'text-sm font-semibold text-muted dark:text-dark-muted hover:text-fjalingo-green transition-colors';

const Footer = () => {
  return (
    <footer className="bg-card dark:bg-dark-card border-t-2 border-border dark:border-dark-border mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Parrot state="idle" size={28} />
              <span className="text-xl font-black text-fjalingo-green">Fjalingo</span>
            </div>
            <p className="text-sm font-semibold text-muted dark:text-dark-muted">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-heading dark:text-dark-text mb-3">{t('footer.navHeading')}</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-sm font-semibold text-muted dark:text-dark-muted hover:text-fjalingo-green transition-colors">
                {t('nav.home')}
              </Link>
              <Link to="/kuizi" className="text-sm font-semibold text-muted dark:text-dark-muted hover:text-fjalingo-green transition-colors">
                {t('nav.quiz')}
              </Link>
              <Link to="/arritjet" className="text-sm font-semibold text-muted dark:text-dark-muted hover:text-fjalingo-green transition-colors">
                {t('nav.achievements')}
              </Link>
              <Link to="/propozo" className="text-sm font-semibold text-muted dark:text-dark-muted hover:text-fjalingo-green transition-colors">
                {t('nav.suggest')}
              </Link>
              <Link to="/premium" className="text-sm font-semibold text-muted dark:text-dark-muted hover:text-fjalingo-green transition-colors">
                {t('nav.pricing')}
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-heading dark:text-dark-text mb-3">{t('footer.contactHeading')}</h4>
            <p className="text-sm font-semibold text-muted dark:text-dark-muted">
              hello@fjalingo.com
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="https://www.instagram.com/codrix.al/"
                target="_blank"
                rel="noreferrer"
                aria-label={t('footer.instagramAria')}
                className="text-muted dark:text-dark-muted hover:text-heading dark:hover:text-dark-text transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://codrixwebsite.vercel.app/"
                target="_blank"
                rel="noreferrer"
                aria-label={t('footer.websiteAria')}
                className="text-muted dark:text-dark-muted hover:text-heading dark:hover:text-dark-text transition-colors"
              >
                <Globe className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/codrix-solutions/"
                target="_blank"
                rel="noreferrer"
                aria-label={t('footer.linkedinAria')}
                className="text-muted dark:text-dark-muted hover:text-heading dark:hover:text-dark-text transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Legal (LEGAL-1) — Paddle domain review requires Terms, Privacy and Refund
              reachable from site navigation on every page. */}
          <div>
            <h4 className="font-bold text-heading dark:text-dark-text mb-3">{t('footer.legalHeading')}</h4>
            <div className="flex flex-col gap-2">
              <Link to="/kushtet" className={legalLinkClass}>{t('footer.links.terms')}</Link>
              <Link to="/privatesia" className={legalLinkClass}>{t('footer.links.privacy')}</Link>
              <Link to="/rimbursimi" className={legalLinkClass}>{t('footer.links.refund')}</Link>
              <Link to="/kontakt" className={legalLinkClass}>{t('footer.links.contact')}</Link>
              <Link to="/en" className={legalLinkClass}>{t('footer.links.english')}</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-border dark:border-dark-border mt-8 pt-6 text-center">
          <OperatorLine className="block text-xs font-semibold text-muted dark:text-dark-muted mb-1" />
          <p className="text-xs font-semibold text-muted dark:text-dark-muted">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
