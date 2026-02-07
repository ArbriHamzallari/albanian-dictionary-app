import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';
import WordCard from '../components/WordCard.jsx';

const WordOfTheDay = () => {
  const [word, setWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWord = async () => {
      try {
        const response = await api.get('/words/word-of-the-day');
        setWord(response.data.word);
      } catch (err) {
        setError('Fjala e ditës nuk është gjetur.');
      } finally {
        setLoading(false);
      }
    };

    fetchWord();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold text-dark mb-6">FJALA E DITËS</h2>
      {loading && <LoadingSpinner />}
      {!loading && <ErrorMessage message={error} />}
      {!loading && word && (
        <div className="grid gap-6">
          <WordCard word={word} />
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-primary">Përkufizimi i plotë</h3>
            <ul className="mt-3 space-y-2">
              {word.definitions.map((definition) => (
                <li key={definition.id}>{definition.definition_text}</li>
              ))}
            </ul>
            {word.conjugations.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-600">Zgjedhimet</h4>
                <div className="grid md:grid-cols-2 gap-3 mt-2">
                  {word.conjugations.map((conjugation) => (
                    <div key={conjugation.id} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500">{conjugation.conjugation_type}</p>
                      <p className="text-sm text-gray-700">{conjugation.conjugation_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WordOfTheDay;
