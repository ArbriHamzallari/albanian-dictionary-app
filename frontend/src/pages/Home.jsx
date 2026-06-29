import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Star, MousePointerClick, ListChecks, PencilLine } from 'lucide-react';
import SearchBar from '../components/SearchBar.jsx';
import WordCard from '../components/WordCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DailyChallengeCard from '../components/DailyChallengeCard.jsx';
import PurposeSection from '../components/PurposeSection.jsx';
import Button from '../components/ui/Button.jsx';
import Heading from '../components/ui/Heading.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import AnimatedBackground from '../components/AnimatedBackground.jsx';
import BackgroundAnimations from '../components/BackgroundAnimations.jsx';
import Seo from '../components/Seo.jsx';
import api from '../utils/api.js';
import { t } from '../i18n/index.js';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 },
};

const SPRING = { type: 'spring', stiffness: 300, damping: 22 };

const numberFormat = new Intl.NumberFormat('sq-AL');

const ScrollHint = ({ reduceMotion }) => (
  <motion.a
    href="#me-teper"
    aria-label={t('home.scrollHint')}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.45, duration: 0.2 }}
    className="group mt-6 flex flex-col items-center gap-2 sm:mt-8"
  >
    <span className="rounded-full border-2 border-brand-green/20 bg-paper px-4 py-1.5 text-sm font-extrabold text-brand-green shadow-[0_3px_0_0_var(--brand-green-dark)] transition-transform group-hover:-translate-y-0.5 group-active:translate-y-0.5 group-active:shadow-none sm:text-base">
      {t('home.scrollHint')}
    </span>
    <motion.span
      aria-hidden="true"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-yellow text-brand-green-dark shadow-[0_3px_0_0_color-mix(in_srgb,var(--accent-yellow)_60%,var(--ink))]"
      animate={reduceMotion ? undefined : { y: [0, 5, 0] }}
      transition={{ ...SPRING, repeat: Infinity, repeatDelay: 0.3 }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-0.5">
        <path
          d="M4 7 L9 12 L14 7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 11 L9 16 L14 11"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />
      </svg>
    </motion.span>
  </motion.a>
);

const Home = () => {
  const reduceMotion = useReducedMotion();
  const [wordOfDay, setWordOfDay] = useState(null);
  const [popularWords, setPopularWords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wordResponse, popularResponse, statsResponse] = await Promise.allSettled([
          api.get('/words/word-of-the-day'),
          api.get('/words/popular'),
          api.get('/public/stats'),
        ]);
        if (wordResponse.status === 'fulfilled') {
          setWordOfDay(wordResponse.value.data.word);
        }
        if (popularResponse.status === 'fulfilled') {
          setPopularWords(popularResponse.value.data.words || []);
        } else if (popularResponse.status === 'rejected') {
          setError(t('home.error.wordsLoad'));
        }
        if (statsResponse.status === 'fulfilled') {
          setStats(statsResponse.value.data);
        }
      } catch {
        setError(t('home.error.dataLoad'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-cloud">
      <Seo
        title="Fjalingo — Fol shqipen e vërtetë, jo fjalë të huazuara"
        description="Fjalingo të ndihmon t'i kthesh fjalët e huazuara (email, meeting, business) në shqipen e vërtetë — me lojë, jo me mësim."
        path="/"
      />
      {/* Splash hero — papagalli, slogani, CTA dhe treguesi i rrëshqitjes */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 py-10 text-center sm:px-6 sm:py-12">
        {/* Designed hero background: brand blobs + dot-grid + falling words */}
        <AnimatedBackground />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 pointer-events-none opacity-[0.06] dark:opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(var(--brand-green) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <BackgroundAnimations />

        <motion.div
          {...fadeUp}
          className="relative z-10 flex w-full max-w-lg flex-col items-center gap-5 sm:gap-7"
        >
          <Parrot state="idle" size={150} className="sm:hidden" />
          <Parrot state="idle" size={200} className="hidden sm:block md:hidden" />
          <Parrot state="idle" size={220} className="hidden md:block" />

          <Heading
            level={1}
            className="text-balance px-1 text-[1.5rem] leading-snug sm:px-2 sm:text-3xl md:text-[2.75rem]"
          >
            {t('home.hero.problem')}
          </Heading>

          <p className="max-w-md text-balance text-base font-semibold text-muted dark:text-dark-muted sm:text-lg">
            {t('home.hero.promise')}
          </p>

          <div className="flex w-full max-w-xs flex-col gap-3 px-2 sm:max-w-md sm:flex-row sm:px-0">
            <Link to="/kuizi" className="flex-1">
              <Button size="lg" fullWidth>
                {t('home.hero.ctaPrimary')}
              </Button>
            </Link>
            <a href="#si-funksionon" className="btn-outline flex-1 inline-flex items-center justify-center">
              {t('home.hero.ctaSecondary')}
            </a>
          </div>

          <ScrollHint reduceMotion={reduceMotion} />
        </motion.div>
      </section>

      {/* Si funksionon — tri llojet e ushtrimeve (emrat e mbyllur të mekanikës) */}
      <section id="si-funksionon" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black text-heading dark:text-dark-text sm:text-3xl">
            {t('home.how.heading')}
          </h2>
          <p className="mt-2 text-sm font-semibold text-muted dark:text-dark-muted">
            {t('home.how.lead')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          {[
            { icon: MousePointerClick, key: 'spot', color: 'text-fjalingo-green' },
            { icon: ListChecks, key: 'translate', color: 'text-fjalingo-blue' },
            { icon: PencilLine, key: 'fill', color: 'text-fjalingo-purple' },
          ].map((ex, i) => (
            <motion.div
              key={ex.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="card py-8 text-center"
            >
              <ex.icon className={`mx-auto mb-3 h-8 w-8 ${ex.color}`} aria-hidden="true" />
              <h3 className="mb-2 text-base font-black text-heading dark:text-dark-text">
                {t(`home.how.${ex.key}.title`)}
              </h3>
              <p className="text-sm font-semibold text-muted dark:text-dark-muted">
                {t(`home.how.${ex.key}.desc`)}
              </p>
            </motion.div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/mesimet">
            <Button size="lg">{t('home.how.cta')}</Button>
          </Link>
        </div>
      </section>

      {/* Përmbajtja poshtë fold-it */}
      <section id="me-teper" className="mx-auto max-w-6xl scroll-mt-6 px-4 pb-12 sm:px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <SearchBar showHint />
        </motion.div>

        <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
          {[
            {
              emoji: '🎯',
              title: t('home.cards.daily.title'),
              desc: t('home.cards.daily.desc'),
              link: '/sfida-e-dites',
              cta: t('home.cards.daily.cta'),
            },
            {
              emoji: '🎮',
              title: t('home.cards.quiz.title'),
              desc: t('home.cards.quiz.desc'),
              link: '/kuizi',
              cta: t('home.cards.quiz.cta'),
            },
            {
              emoji: '🏆',
              title: t('home.cards.achievements.title'),
              desc: t('home.cards.achievements.desc'),
              link: '/arritjet',
              cta: t('home.cards.achievements.cta'),
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
            >
              <Link to={card.link} className="card card-hover block text-center py-8">
                <span className="text-4xl block mb-3">{card.emoji}</span>
                <h3 className="text-sm font-black text-heading dark:text-dark-text tracking-wide mb-2">
                  {card.title}
                </h3>
                <p className="text-sm font-semibold text-muted dark:text-dark-muted mb-4">{card.desc}</p>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-fjalingo-green">
                  {card.cta} <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <DailyChallengeCard />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
          {[
            { key: 'words', label: t('home.stats.words'), emoji: '📚' },
            { key: 'users', label: t('home.stats.users'), emoji: '👥' },
            { key: 'searches', label: t('home.stats.searches'), emoji: '🔍' },
          ].map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="card py-4 text-center sm:py-6"
            >
              <span className="mb-1 block text-xl sm:mb-2 sm:text-2xl">{stat.emoji}</span>
              {stats ? (
                <p className="text-lg font-black text-heading dark:text-dark-text sm:text-2xl md:text-3xl">
                  {numberFormat.format(stats[stat.key])}
                </p>
              ) : (
                <span className="mx-auto block h-6 w-12 animate-pulse rounded bg-line dark:bg-dark-border sm:h-8" />
              )}
              <p className="mt-0.5 text-xs font-semibold text-muted dark:text-dark-muted sm:mt-1 sm:text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="card border-fjalingo-yellow/30 bg-gradient-to-br from-fjalingo-yellow/5 to-transparent dark:from-fjalingo-yellow/3">
          <h3 className="text-sm font-black text-fjalingo-yellow tracking-wide flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 fill-fjalingo-yellow text-fjalingo-yellow" /> {t('home.wotd.heading')}
          </h3>
          {loading && <LoadingSpinner />}
          {!loading && <ErrorMessage message={error} />}
          {!loading && !wordOfDay && !error && (
            <p className="text-muted dark:text-dark-muted font-semibold">
              {t('home.wotd.empty')}
            </p>
          )}
          {!loading && wordOfDay && (
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-sm font-semibold text-muted dark:text-dark-muted">{t('home.wotd.borrowedLabel')}</p>
                <h4 className="text-2xl font-black text-heading dark:text-dark-text">{wordOfDay.borrowed_word}</h4>
                <p className="text-sm font-semibold text-muted dark:text-dark-muted mt-3">{t('home.wotd.correctLabel')}</p>
                <p className="text-xl font-bold text-fjalingo-green">{wordOfDay.correct_albanian}</p>
              </div>
              <div>
                <p className="text-sm text-body dark:text-dark-muted">
                  {wordOfDay.definitions?.[0]?.definition_text}
                </p>
                <Link
                  to={`/fjala/${wordOfDay.id}`}
                  className="inline-flex items-center gap-1 mt-4 text-fjalingo-green font-bold hover:gap-2 transition-all"
                >
                  {t('home.wotd.seeMore')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <PurposeSection />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-black text-heading dark:text-dark-text sm:text-lg">
            {t('home.popular.heading')}
          </h3>
          <Link to="/kerko?q=investigoj" className="inline-flex items-center gap-1 text-sm font-bold text-fjalingo-green transition-all hover:gap-2">
            {t('home.popular.seeAll')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          {popularWords.map((word) => (
            <WordCard key={word.id} word={word} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
