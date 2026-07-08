import { useSearchParams } from 'react-router-dom';
import GameEngine from '../games/GameEngine.jsx';

// Thin page: reads the optional origin world from the "Praktiko" CTA
// (/kuizi?origjina=<code>) and hands it to the one game engine. All session,
// scoring, and rendering logic lives in GameEngine + its per-type renderers.
const Quiz = () => {
  const [searchParams] = useSearchParams();
  const origin = searchParams.get('origjina');

  return <GameEngine key={origin || 'default'} origin={origin} />;
};

export default Quiz;
