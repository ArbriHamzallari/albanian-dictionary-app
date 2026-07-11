import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Eyebrow from '../ui/Eyebrow.jsx';
import SectionTitle from '../ui/SectionTitle.jsx';
import Button from '../ui/Button.jsx';
import HeroBackground from './hero/HeroBackground.jsx';
import HeroPhone from './hero/HeroPhone.jsx';
import { t } from '../../i18n/index.js';

// Section 1 — the hero (m4-rebrand.md §5.1). One eyebrow → ≤2-line headline with
// exactly one brand-green word → short subline → primary CTA (keeps the /kuizi
// funnel) + secondary outline CTA (smooth-scroll to the demo) → trust microline.
// Right: PhoneFrame quiz replica + floating parrot. The single page-load moment
// (§3.8) is an orchestrated stagger, fully disabled under reduced motion.

// This is the hero's load moment — NOT the shared scroll-reveal (§3.8). Total
// runtime stays under 1.5s.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const OUTLINE_CTA =
  'inline-flex h-14 items-center justify-center rounded-2xl border-2 border-line ' +
  'bg-paper px-8 text-base font-extrabold text-ink shadow-[0_3px_0_0_var(--line)] ' +
  'transition-[box-shadow,transform] duration-100 ease-out hover:bg-cloud ' +
  'active:translate-y-[3px] active:shadow-none ' +
  'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-green/40';

const LandingHero = () => {
  const reduceMotion = useReducedMotion();

  const scrollToDemo = (e) => {
    const el = document.getElementById('demo');
    if (!el) return; // no JS-free harm: the href="#demo" still jumps
    e.preventDefault();
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const trust = [
    t('TODO_SQ_landing_hero_trust_1'),
    t('TODO_SQ_landing_hero_trust_2'),
    t('TODO_SQ_landing_hero_trust_3'),
  ].join(' · ');

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-[image:var(--surface-hero)]"
    >
      <HeroBackground />

      <motion.div
        className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:py-[120px]"
        variants={container}
        initial={reduceMotion ? false : 'hidden'}
        animate={reduceMotion ? false : 'show'}
      >
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <motion.div variants={item}>
              <Eyebrow>{t('TODO_SQ_landing_hero_eyebrow')}</Eyebrow>
            </motion.div>

            <motion.div variants={item} className="mt-5">
              <SectionTitle
                as="h1"
                title={t('TODO_SQ_landing_hero_headline')}
                accentWord={t('TODO_SQ_landing_hero_headline_accent')}
                accent="green"
                subline={t('TODO_SQ_landing_hero_subline')}
              />
            </motion.div>

            <motion.div
              variants={item}
              className="mt-7 flex w-full max-w-xs flex-col gap-3 sm:max-w-md sm:flex-row md:mx-0"
            >
              <Link to="/kuizi" className="flex-1">
                <Button size="lg" fullWidth>
                  {t('home.hero.ctaPrimary')}
                </Button>
              </Link>
              <a
                href="#demo"
                onClick={scrollToDemo}
                className={`flex-1 ${OUTLINE_CTA}`}
              >
                {t('home.hero.ctaDemo')}
              </a>
            </motion.div>

            <motion.p
              variants={item}
              className="mt-5 text-sm font-bold text-ink-soft"
            >
              {trust}
            </motion.p>
          </div>

          <motion.div variants={item} className="flex justify-center md:justify-end">
            <HeroPhone />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default LandingHero;
