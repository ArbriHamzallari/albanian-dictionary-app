import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Heading from '../ui/Heading.jsx';
import Button from '../ui/Button.jsx';
import Parrot from '../mascot/Parrot.jsx';
import AnimatedBackground from '../AnimatedBackground.jsx';
import { t } from '../../i18n/index.js';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};

// Section 1 of the landing (M4 decode): one emotional promise, a subtitle naming
// the mechanic, two CTAs (start free + jump to the playable demo), a trust microline,
// and the parrot mascot on the right — replacing the retired falling word-cloud.
const LandingHero = () => (
  <section className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20">
    <AnimatedBackground />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.06] dark:opacity-[0.04]"
      style={{
        backgroundImage: 'radial-gradient(var(--brand-green) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    />

    <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-12">
      <motion.div
        {...fadeUp}
        className="flex flex-col items-center text-center md:items-start md:text-left"
      >
        <Heading
          level={1}
          className="text-balance text-[1.6rem] leading-snug sm:text-4xl md:text-[2.75rem]"
        >
          {t('home.hero.problem')}
        </Heading>

        <p className="mt-4 max-w-md text-balance text-base font-semibold text-muted dark:text-dark-muted sm:text-lg">
          {t('home.hero.promise')}
        </p>

        <div className="mt-7 flex w-full max-w-xs flex-col gap-3 sm:max-w-md sm:flex-row md:mx-0">
          <Link to="/kuizi" className="flex-1">
            <Button size="lg" fullWidth>
              {t('home.hero.ctaPrimary')}
            </Button>
          </Link>
          <a
            href="#demo"
            className="btn-outline inline-flex flex-1 items-center justify-center"
          >
            {t('home.hero.ctaDemo')}
          </a>
        </div>

        <p className="mt-5 text-sm font-bold text-muted dark:text-dark-muted">
          {t('home.hero.microline')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex justify-center md:justify-end"
      >
        <Parrot state="wave" size={200} className="sm:hidden" />
        <Parrot state="wave" size={260} className="hidden sm:block md:hidden" />
        <Parrot state="wave" size={300} className="hidden md:block" />
      </motion.div>
    </div>
  </section>
);

export default LandingHero;
