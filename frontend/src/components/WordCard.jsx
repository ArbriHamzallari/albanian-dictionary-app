import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';

const categoryColors = {
  'Folje': 'badge-green',
  'Emër': 'badge-blue',
  'Mbiemër': 'badge-purple',
  'Ndajfolje': 'badge-orange',
};

const WordCard = ({ word }) => {
  const badgeClass = categoryColors[word.category] || 'badge-blue';

  return (
    <div className="card card-hover group">
      <div className="flex flex-col gap-3">
        {/* Borrowed → Correct */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-lg font-bold text-muted dark:text-dark-muted line-through decoration-1">
            {word.borrowed_word}
          </span>
          <ArrowRight className="w-4 h-4 text-fjalingo-green flex-shrink-0" />
          <span className="text-xl font-black text-fjalingo-green">
            {word.correct_albanian}
          </span>
        </div>

        {/* Category badge */}
        <div className="flex items-center gap-2">
          {word.category && (
            <span className={`badge ${badgeClass}`}>
              {word.category}
            </span>
          )}
        </div>

        {/* Definition */}
        {word.definitions?.length > 0 && (
          <p className="text-sm text-body dark:text-dark-muted line-clamp-2">
            {word.definitions[0].definition_text}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link
            to={`/fjala/${word.id}`}
            className="inline-flex items-center gap-1 text-fjalingo-green text-sm font-bold
                       hover:gap-2 transition-all"
          >
            Detaje <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WordCard;
