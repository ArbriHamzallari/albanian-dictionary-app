import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import SearchBar from '../components/SearchBar.jsx';
import WordCard from '../components/WordCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DailyChallengeCard from '../components/DailyChallengeCard.jsx';
import PurposeSection from '../components/PurposeSection.jsx';
import Button from '../components/ui/Button.jsx';
import Heading from '../components/ui/Heading.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import api from '../utils/api.js';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 },
};

const SPRING = { type: 'spring', stiffness: 300, damping: 22 };

const ScrollHint = ({ reduceMotion }) => (
  <motion.a
    href="#me-teper"
    aria-label="Shiko ç'të pret poshtë"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.45, duration: 0.2 }}
    className="group mt-6 flex flex-col items-center gap-2 sm:mt-8"
  >
    <span className="rounded-full border-2 border-brand-green/20 bg-paper px-4 py-1.5 text-sm font-extrabold text-brand-green shadow-[0_3px_0_0_var(--brand-green-dark)] transition-transform group-hover:-translate-y-0.5 group-active:translate-y-0.5 group-active:shadow-none sm:text-base">
      Shiko ç&apos;të pret poshtë
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wordResponse, popularResponse] = await Promise.allSettled([
          api.get('/words/word-of-the-day'),
          api.get('/words/popular'),
        ]);
        if (wordResponse.status === 'fulfilled') {
          setWordOfDay(wordResponse.value.data.word);
        }
        if (popularResponse.status === 'fulfilled') {
          setPopularWords(popularResponse.value.data.words || []);
        } else if (popularResponse.status === 'rejected') {
          setError('Nuk mund të ngarkohen fjalët. Kontrolloni që backend dhe baza e të dhënave të jenë aktiv.');
        }
      } catch {
        setError('Nuk mund të ngarkohen të dhënat tani.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-cloud">
      {/* Splash hero — papagalli, slogani, CTA dhe treguesi i rrëshqitjes */}
      <section className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10 text-center sm:px-6 sm:py-12">
        <motion.div
          {...fadeUp}
          className="flex w-full max-w-lg flex-col items-center gap-5 sm:gap-7"
        >
          <Parrot state="wave" size={150} className="sm:hidden" />
          <Parrot state="wave" size={200} className="hidden sm:block md:hidden" />
          <Parrot state="wave" size={220} className="hidden md:block" />

          <Heading
            level={1}
            className="text-balance px-1 text-[1.65rem] leading-snug sm:px-2 sm:text-3xl md:text-5xl"
          >
            Fol shqipen e vërtetë, jo të huazuarën
          </Heading>

          <Link to="/kuizi" className="w-full max-w-xs px-2 sm:px-0">
            <Button size="lg" fullWidth>
              Fillo
            </Button>
          </Link>

          <ScrollHint reduceMotion={reduceMotion} />
        </motion.div>
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
              title: 'SFIDA E DITËS',
              desc: 'Testoje veten çdo ditë!',
              link: '/fjala-e-dites',
              cta: 'Fillo',
            },
            {
              emoji: '🎮',
              title: 'KUIZI I SHPEJTË',
              desc: 'Luaj dhe mëso fjalë të reja!',
              link: '/kuizi',
              cta: 'Luaj tani!',
            },
            {
              emoji: '🏆',
              title: 'ARRITJET',
              desc: 'Shkyç arritje dhe mbledh pikë!',
              link: '/arritjet',
              cta: 'Shiko',
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
            { label: 'Fjalë', value: '500+', emoji: '📚' },
            { label: 'Përdorues', value: '150+', emoji: '👥' },
            { label: 'Kërkime', value: '1,200+', emoji: '🔍' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="card py-4 text-center sm:py-6"
            >
              <span className="mb-1 block text-xl sm:mb-2 sm:text-2xl">{stat.emoji}</span>
              <p className="text-lg font-black text-heading dark:text-dark-text sm:text-2xl md:text-3xl">{stat.value}</p>
              <p className="mt-0.5 text-xs font-semibold text-muted dark:text-dark-muted sm:mt-1 sm:text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="card border-fjalingo-yellow/30 bg-gradient-to-br from-fjalingo-yellow/5 to-transparent dark:from-fjalingo-yellow/3">
          <h3 className="text-sm font-black text-fjalingo-yellow tracking-wide flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 fill-fjalingo-yellow text-fjalingo-yellow" /> FJALA E DITËS
          </h3>
          {loading && <LoadingSpinner />}
          {!loading && <ErrorMessage message={error} />}
          {!loading && !wordOfDay && !error && (
            <p className="text-muted dark:text-dark-muted font-semibold">
              Fjala e ditës nuk është vendosur ende.
            </p>
          )}
          {!loading && wordOfDay && (
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-sm font-semibold text-muted dark:text-dark-muted">Fjala e huazuar</p>
                <h4 className="text-2xl font-black text-heading dark:text-dark-text">{wordOfDay.borrowed_word}</h4>
                <p className="text-sm font-semibold text-muted dark:text-dark-muted mt-3">Fjala e saktë shqipe</p>
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
                  Shiko zgjedhjen e fjalës <ArrowRight className="w-4 h-4" />
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
            Fjalët më të kërkuara 🔥
          </h3>
          <Link to="/kerko?q=investigoj" className="inline-flex items-center gap-1 text-sm font-bold text-fjalingo-green transition-all hover:gap-2">
            Shiko të gjitha <ArrowRight className="h-4 w-4" />
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
