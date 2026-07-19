import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { t } from '../../i18n/index.js';

// GAME-2 (Çifto fjalët): tap a borrowed word and its Albanian match to pair them.
// Selection can start from EITHER column — tap a tile to select it (brand-green
// border + lift), then tap a tile in the other column to resolve the pair. A correct
// pair locks green and settles; a wrong pair flashes coral (with a shake when motion
// is allowed) then clears. When all pairs are matched the renderer reports the final
// leftId->rightId mapping via onComplete; the engine records it and submits it with
// the batch. Immediate lock/shake feedback uses each tile's hidden `pairId` — see the
// factory for why that is safe (the server still grades the submitted mapping
// authoritatively). NOTE: left/right ids share the same 0..N-1 space, but leftIds are
// only ever `matched` keys and rightIds only ever `matchedRightIds` values, so the
// two never collide — the payload shape (leftId->rightId) is unchanged.
const MatchPairs = ({ question, onComplete, onNext, isLast }) => {
  const { left, right } = question.prompt;
  const [selected, setSelected] = useState(null); // { side: 'left'|'right', id } | null
  const [matched, setMatched] = useState({}); // leftId -> rightId
  const [shake, setShake] = useState(null); // { leftId, rightId } transient

  const matchedRightIds = new Set(Object.values(matched));
  const isComplete = Object.keys(matched).length === left.length;

  const isTileMatched = (side, id) =>
    side === 'left' ? matched[id] !== undefined : matchedRightIds.has(id);

  // One selection model for both columns: first tap (or re-tap within the same
  // column) selects; a tap in the OTHER column resolves the pair — regardless of
  // which column the user started from.
  const tapTile = (side, id) => {
    if (isComplete || isTileMatched(side, id)) return;

    if (!selected || selected.side === side) {
      setSelected({ side, id });
      return;
    }

    const leftId = side === 'left' ? id : selected.id;
    const rightId = side === 'left' ? selected.id : id;
    const leftTile = left.find((tile) => tile.id === leftId);
    const rightTile = right.find((tile) => tile.id === rightId);

    if (leftTile.pairId === rightTile.pairId) {
      const next = { ...matched, [leftId]: rightId };
      setMatched(next);
      setSelected(null);
      if (Object.keys(next).length === left.length) {
        onComplete(next);
      }
    } else {
      setShake({ leftId, rightId });
      setSelected(null);
      setTimeout(() => setShake(null), 500);
    }
  };

  const tileClass = (side, tile) => {
    if (isTileMatched(side, tile.id)) {
      return 'card border-fjalingo-green bg-fjalingo-green/15 opacity-70 cursor-default';
    }
    const isShaking = shake && (side === 'left' ? shake.leftId === tile.id : shake.rightId === tile.id);
    if (isShaking) return 'card border-accent-coral bg-accent-coral/10 motion-safe:animate-shake';
    if (selected?.side === side && selected.id === tile.id) {
      return 'card border-fjalingo-green bg-fjalingo-green/10 -translate-y-1 shadow-card-hover ring-2 ring-fjalingo-green cursor-pointer';
    }
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
              onClick={() => tapTile('left', tile.id)}
              disabled={isTileMatched('left', tile.id) || isComplete}
              className={`${tileClass('left', tile)} text-center`}
            >
              <span className="font-bold text-heading dark:text-dark-text">{tile.text}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {right.map((tile) => (
            <button
              key={`r-${tile.id}`}
              onClick={() => tapTile('right', tile.id)}
              disabled={isTileMatched('right', tile.id) || isComplete}
              className={`${tileClass('right', tile)} text-center`}
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
