import { useEffect, useState } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import WordCard from '../components/WordCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import api from '../utils/api.js';
import { Link } from 'react-router-dom';

const Home = () => {
  const [wordOfDay, setWordOfDay] = useState(null);
  const [popularWords, setPopularWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wordResponse, popularResponse] = await Promise.all([
          api.get('/words/word-of-the-day'),
          api.get('/words/popular'),
        ]);
        setWordOfDay(wordResponse.data.word);
        setPopularWords(popularResponse.data.words || []);
      } catch (err) {
        setError('Nuk mund të ngarkohen të dhënat tani.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-light">
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-dark">
            Zbulo fjalën e duhur shqipe për fjalët që përdor çdo ditë
          </h2>
          <p className="text-gray-600">
            Platformë edukative për nxënësit dhe mësuesit e Shkollës 7 Marsi.
          </p>
        </div>
        <div className="mt-10 max-w-2xl mx-auto">
          <SearchBar />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-primary">FJALA E DITËS</h3>
          {loading && <LoadingSpinner />}
          {!loading && <ErrorMessage message={error} />}
          {!loading && wordOfDay && (
            <div className="mt-4 grid md:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-sm text-gray-500">Fjala e huazuar</p>
                <h4 className="text-2xl font-bold">{wordOfDay.borrowed_word}</h4>
                <p className="text-sm text-gray-500 mt-2">Fjala e saktë shqipe</p>
                <p className="text-xl font-semibold text-primary">{wordOfDay.correct_albanian}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Përkufizimi: {wordOfDay.definitions?.[0]?.definition_text}
                </p>
                <Link
                  to={`/fjala/${wordOfDay.id}`}
                  className="inline-block mt-3 text-accent font-semibold"
                >
                  Shiko zgjedhjen e fjalës →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { label: 'Fjalë', value: '500+' },
            { label: 'Përdorues', value: '150+' },
            { label: 'Kërkime', value: '1,200+' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6 text-center">
              <p className="text-2xl font-bold text-dark">{stat.value}</p>
              <p className="text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Fjalët më të kërkuara</h3>
          <Link to="/kerko?q=investigoj" className="text-accent text-sm">
            Shiko të gjitha →
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
