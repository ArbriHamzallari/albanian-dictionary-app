import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';

const categoryColors = {
  'Folje': 'badge-green',
  'Emër': 'badge-blue',
  'Mbiemër': 'badge-purple',
  'Ndajfolje': 'badge-orange',
};

const WordDetail = () => {
  const { id } = useParams();
  const [word, setWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWord = async () => {
      try {
        const response = await api.get(`/words/${id}`);
        setWord(response.data.word);
      } catch {
        setError('Fjala nuk u gjet.');
      } finally {
        setLoading(false);
      }
    };
    fetchWord();
  }, [id]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-1 text-fjalingo-green text-sm font-bold hover:gap-2 transition-all mb-6">
        <ArrowLeft className="w-4 h-4" /> Kthehu
      </Link>

      {loading && <LoadingSpinner />}
      {!loading && <ErrorMessage message={error} />}

      {!loading && word && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="card border-fjalingo-green/30">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span className="text-xl font-bold text-muted dark:text-dark-muted line-through decoration-1">
                {word.borrowed_word}
              </span>
              <ArrowRight className="w-5 h-5 text-fjalingo-green" />
              <span className="text-3xl font-black text-fjalingo-green">
                {word.correct_albanian}
              </span>
            </div>
            {word.category && (
              <span className={`badge ${categoryColors[word.category] || 'badge-blue'}`}>
                {word.category}
              </span>
            )}
          </div>

          {/* Definitions */}
          <div className="card">
            <h3 className="text-sm font-black text-fjalingo-blue tracking-wide mb-4">📖 PËRKUFIZIMI</h3>
            <ul className="space-y-3">
              {word.definitions.map((def, i) => (
                <li key={def.id} className="flex gap-3">
                  <span className="w-6 h-6 rounded-lg bg-fjalingo-blue/10 flex items-center justify-center text-xs font-black text-fjalingo-blue flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-body dark:text-dark-text font-semibold">{def.definition_text}</p>
                    {def.example_sentence && (
                      <p className="text-sm text-muted dark:text-dark-muted italic mt-1">
                        "{def.example_sentence}"
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Conjugations */}
          {word.conjugations.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-black text-fjalingo-purple tracking-wide mb-4">🔤 ZGJEDHIMI I FJALËS</h3>
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

          {/* Examples */}
          {word.definitions.some((def) => def.example_sentence) && (
            <div className="card">
              <h3 className="text-sm font-black text-fjalingo-yellow tracking-wide mb-4">💡 SHEMBUJ</h3>
              <ul className="space-y-2">
                {word.definitions
                  .filter((def) => def.example_sentence)
                  .map((def) => (
                    <li key={`ex-${def.id}`} className="text-sm text-body dark:text-dark-text font-semibold">
                      — {def.example_sentence}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default WordDetail;
