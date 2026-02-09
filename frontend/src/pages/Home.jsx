import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Target, Gamepad2, Trophy, ArrowRight, Star } from 'lucide-react';
import SearchBar from '../components/SearchBar.jsx';
import WordCard from '../components/WordCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DailyChallengeCard from '../components/DailyChallengeCard.jsx';
import PurposeSection from '../components/PurposeSection.jsx';
import AnimatedBackground from '../components/AnimatedBackground.jsx';
import api from '../utils/api.js';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

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
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <AnimatedBackground />
        <div className="absolute inset-0 bg-gradient-to-br from-fjalingo-green/5 via-transparent to-fjalingo-blue/5 dark:from-fjalingo-green/3 dark:to-fjalingo-blue/3 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-16 text-center z-10">
          <motion.div {...fadeUp}>
            <motion.span
              className="text-5xl md:text-6xl block mb-4"
              animate={
                reduceMotion
                  ? {}
                  : { y: [0, -6, 0], rotate: [0, 1.5, 0, -1.5, 0] }
              }
              transition={
                reduceMotion
                  ? {}
                  : { duration: 6, ease: 'easeInOut', repeat: Infinity }
              }
            >
              🦅
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-black text-heading dark:text-dark-text mb-4 leading-tight">
              Mëso shqipen autentike,<br />
              <span className="text-fjalingo-green">argëtohu ndërkohë!</span>
            </h2>
            <p className="text-xl md:text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-fjalingo-green to-fjalingo-blue max-w-2xl mx-auto mb-8">
              Kthe fjalët e huazuara në shqipe të pastër.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto mb-6"
          >
            <SearchBar showHint />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link to="/kuizi" className="btn-primary inline-flex items-center gap-2 text-lg px-10 py-4">
              Fillo Tani <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Target,
              emoji: '🎯',
              title: 'SFIDA E DITËS',
              desc: 'Testoje veten çdo ditë!',
              color: 'border-fjalingo-green/30 bg-fjalingo-green/5 dark:bg-fjalingo-green/3',
              iconColor: 'text-fjalingo-green',
              link: '/fjala-e-dites',
              cta: 'Fillo',
            },
            {
              icon: Gamepad2,
              emoji: '🎮',
              title: 'KUIZI I SHPEJTË',
              desc: 'Luaj dhe mëso fjalë të reja!',
              color: 'border-fjalingo-blue/30 bg-fjalingo-blue/5 dark:bg-fjalingo-blue/3',
              iconColor: 'text-fjalingo-blue',
              link: '/kuizi',
              cta: 'Luaj tani!',
            },
            {
              icon: Trophy,
              emoji: '🏆',
              title: 'ARRITJET',
              desc: 'Shkyç arritje dhe mbledh pikë!',
              color: 'border-fjalingo-purple/30 bg-fjalingo-purple/5 dark:bg-fjalingo-purple/3',
              iconColor: 'text-fjalingo-purple',
              link: '/arritjet',
              cta: 'Shiko',
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
            >
              <Link to={card.link} className={`card card-hover block ${card.color} text-center py-8`}>
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

      {/* Daily Challenge */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <DailyChallengeCard />
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-3 gap-4 md:gap-6">
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
              className="card text-center py-6"
            >
              <span className="text-2xl block mb-2">{stat.emoji}</span>
              <p className="text-2xl md:text-3xl font-black text-heading dark:text-dark-text">{stat.value}</p>
              <p className="text-sm font-semibold text-muted dark:text-dark-muted mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Word of the Day */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
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

      {/* Purpose Section */}
      <PurposeSection />

      {/* Popular Words */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-heading dark:text-dark-text">
            Fjalët më të kërkuara 🔥
          </h3>
          <Link to="/kerko?q=investigoj" className="text-fjalingo-green text-sm font-bold hover:gap-2 inline-flex items-center gap-1 transition-all">
            Shiko të gjitha <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {popularWords.map((word) => (
            <WordCard key={word.id} word={word} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
