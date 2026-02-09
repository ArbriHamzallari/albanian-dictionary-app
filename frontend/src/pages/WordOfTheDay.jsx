import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import WordCard from '../components/WordCard.jsx';
import api from '../utils/api.js';

const WordOfTheDay = () => {
  const [word, setWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWord = async () => {
      try {
        const response = await api.get('/words/word-of-the-day');
        setWord(response.data.word);
      } catch {
        setError('Fjala e ditës nuk është gjetur.');
      } finally {
        setLoading(false);
      }
    };
    fetchWord();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Star className="w-10 h-10 mx-auto mb-3 text-fjalingo-yellow fill-fjalingo-yellow" />
        <h2 className="text-3xl font-black text-heading dark:text-dark-text">
          FJALA E DITËS
        </h2>
      </motion.div>

      {loading && <LoadingSpinner />}
      {!loading && <ErrorMessage message={error} />}

      {!loading && word && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <WordCard word={word} />

          <div className="card">
            <h3 className="text-sm font-black text-fjalingo-blue tracking-wide mb-4">📖 PËRKUFIZIMI I PLOTË</h3>
            <ul className="space-y-3">
              {word.definitions.map((def, i) => (
                <li key={def.id} className="flex gap-3">
                  <span className="w-6 h-6 rounded-lg bg-fjalingo-blue/10 flex items-center justify-center text-xs font-black text-fjalingo-blue flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-body dark:text-dark-text font-semibold">{def.definition_text}</p>
                    {def.example_sentence && (
                      <p className="text-sm text-muted dark:text-dark-muted italic mt-1">"{def.example_sentence}"</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {word.conjugations.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-black text-fjalingo-purple tracking-wide mb-4">🔤 ZGJEDHIMET</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {word.conjugations.map((conj) => (
                  <div key={conj.id} className="card py-4 px-4 border-fjalingo-purple/20">
                    <p className="text-xs font-black text-fjalingo-purple mb-2">{conj.conjugation_type}</p>
                    <p className="text-sm font-semibold text-body dark:text-dark-text">{conj.conjugation_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default WordOfTheDay;
