import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import GameEngine from '../games/GameEngine.jsx';

// Thin page: reads the optional origin world (/kuizi?origjina=<code>, from the
// "Praktiko" CTA and the Luaj hub) and the optional single game type
// (/kuizi?loja=<type>, from the Luaj hub cards) and hands both to the one game engine.
// `loja` maps to the backend's existing `types` array param; absent → the ramped mix.
// All session, scoring, and rendering logic lives in GameEngine + its renderers.
const Quiz = () => {
  const [searchParams] = useSearchParams();
  const origin = searchParams.get('origjina');
  const loja = searchParams.get('loja');
  // Memoized so the array identity is stable across re-renders (GameEngine keys its
  // session fetch off it) — it only changes when the selected game type changes.
  const types = useMemo(() => (loja ? [loja] : null), [loja]);

  return (
    <GameEngine
      key={`${origin || 'default'}-${loja || 'mix'}`}
      origin={origin}
      types={types}
    />
  );
};

export default Quiz;
