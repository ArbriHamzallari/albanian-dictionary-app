import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';

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
      } catch (err) {
        setError('Fjala nuk u gjet.');
      } finally {
        setLoading(false);
      }
    };

    fetchWord();
  }, [id]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link to="/" className="text-accent text-sm">
        ← Kthehu
      </Link>

      {loading && <LoadingSpinner />}
      {!loading && <ErrorMessage message={error} />}

      {!loading && word && (
        <div className="mt-6 space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-dark">{word.correct_albanian}</h2>
            <p className="text-gray-500">({word.borrowed_word} - fjalë e huazuar)</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-primary">KATEGORIA</h3>
            <p className="text-lg mt-2">{word.category || 'Pa kategori'}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-primary">PËRKUFIZIMI</h3>
            <ul className="mt-3 space-y-2">
              {word.definitions.map((definition) => (
                <li key={definition.id} className="text-gray-700">
                  {definition.definition_text}
                </li>
              ))}
            </ul>
          </div>

          {word.conjugations.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-primary">ZGJEDHIMI I FJALËS</h3>
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                {word.conjugations.map((conjugation) => (
                  <div key={conjugation.id} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-600">{conjugation.conjugation_type}</p>
                    <p className="text-gray-700 mt-1">{conjugation.conjugation_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {word.definitions.some((definition) => definition.example_sentence) && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-primary">SHEMBUJ</h3>
              <ul className="mt-3 space-y-2">
                {word.definitions
                  .filter((definition) => definition.example_sentence)
                  .map((definition) => (
                    <li key={`example-${definition.id}`} className="text-gray-700">
                      - {definition.example_sentence}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WordDetail;
