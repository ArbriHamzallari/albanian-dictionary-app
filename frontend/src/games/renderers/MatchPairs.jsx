import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { t } from '../../i18n/index.js';

// GAME-2 (Çifto fjalët): tap a borrowed word on the left, then its Albanian match on
// the right. A correct pair locks green; a wrong pair shakes coral and unlocks. When
// all pairs are matched the renderer reports the final leftId->rightId mapping via
// onComplete; the engine records it and submits it with the batch. Immediate lock/
// shake feedback uses each tile's hidden `pairId` — see the factory for why that is
// safe (the server still grades the submitted mapping authoritatively).
const MatchPairs = ({ question, onComplete, onNext, isLast }) => {
  const { left, right } = question.prompt;
  const [selectedLeft, setSelectedLeft] = useState(null); // leftId
  const [matched, setMatched] = useState({}); // leftId -> rightId
  const [shake, setShake] = useState(null); // { leftId, rightId } transient

  const matchedRightIds = new Set(Object.values(matched));
  const isComplete = Object.keys(matched).length === left.length;

  const tapLeft = (leftId) => {
    if (isComplete || matched[leftId] !== undefined) return;
    setSelectedLeft(leftId);
  };

  const tapRight = (rightId) => {
    if (isComplete || selectedLeft === null || matchedRightIds.has(rightId)) return;

    const leftTile = left.find((tItem) => tItem.id === selectedLeft);
    const rightTile = right.find((tItem) => tItem.id === rightId);

    if (leftTile.pairId === rightTile.pairId) {
      const next = { ...matched, [selectedLeft]: rightId };
      setMatched(next);
      setSelectedLeft(null);
      if (Object.keys(next).length === left.length) {
        onComplete(next);
      }
    } else {
      setShake({ leftId: selectedLeft, rightId });
      setSelectedLeft(null);
      setTimeout(() => setShake(null), 500);
    }
  };

  const leftClass = (tile) => {
    if (matched[tile.id] !== undefined) return 'card border-fjalingo-green bg-fjalingo-green/10 cursor-default';
    if (shake?.leftId === tile.id) return 'card border-accent-coral bg-accent-coral/10 animate-shake';
    if (selectedLeft === tile.id) return 'card border-fjalingo-blue bg-fjalingo-blue/10';
    return 'card card-hover cursor-pointer';
  };

  const rightClass = (tile) => {
    if (matchedRightIds.has(tile.id)) return 'card border-fjalingo-green bg-fjalingo-green/10 cursor-default';
    if (shake?.rightId === tile.id) return 'card border-accent-coral bg-accent-coral/10 animate-shake';
    return 'card card-hover cursor-pointer';
  };

  return (
    <>
      <div className="card mb-6">
        <p className="text-sm font-semibold text-muted dark:text-dark-muted">
          {t('quiz.match.instruction')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          {left.map((tile) => (
            <button
              key={`l-${tile.id}`}
              onClick={() => tapLeft(tile.id)}
              disabled={matched[tile.id] !== undefined || isComplete}
              className={`${leftClass(tile)} text-center`}
            >
              <span className="font-bold text-heading dark:text-dark-text">{tile.text}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {right.map((tile) => (
            <button
              key={`r-${tile.id}`}
              onClick={() => tapRight(tile.id)}
              disabled={matchedRightIds.has(tile.id) || isComplete}
              className={`${rightClass(tile)} text-center`}
            >
              <span className="font-bold text-heading dark:text-dark-text">{tile.text}</span>
            </button>
          ))}
        </div>
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <button onClick={onNext} className="btn-primary inline-flex items-center gap-2">
            {isLast ? t('quiz.seeResult') : t('quiz.continue')} <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </>
  );
};

export default MatchPairs;
