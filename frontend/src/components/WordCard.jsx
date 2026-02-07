import { Link } from 'react-router-dom';

const WordCard = ({ word }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">Fjala e huazuar</p>
        <h3 className="text-2xl font-bold text-dark">{word.borrowed_word}</h3>
        <p className="text-sm text-gray-500">Fjala e saktë shqipe</p>
        <p className="text-xl font-semibold text-primary">{word.correct_albanian}</p>
        <p className="text-sm text-gray-600">Kategoria: {word.category || 'Pa kategori'}</p>
        {word.definitions?.length ? (
          <p className="text-sm text-gray-700">Përkufizimi: {word.definitions[0].definition_text}</p>
        ) : null}
        <Link
          to={`/fjala/${word.id}`}
          className="text-accent text-sm font-semibold mt-2"
        >
          Shiko zgjedhjen e fjalës →
        </Link>
      </div>
    </div>
  );
};

export default WordCard;
