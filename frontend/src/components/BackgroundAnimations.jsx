import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';

// Alblish loanwords paired with their authentic Albanian replacements — the
// wedge made visual. Edit this list to change the rain.
const WORDS = [
  'email', 'meeting', 'business', 'deadline', 'brunch', 'ok', 'feedback', 'weekend', 'online', 'update',
  'postë elektronike', 'takim', 'biznes', 'afat', 'mëngjes i vonshëm', 'në rregull', 'kthim', 'fundjavë', 'në linjë', 'përditësim',
];

const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];

// Falling-words hero background. Words rain from above the hero to below it,
// fading in near the top and out near the bottom (opacity envelope lives in the
// `fall` keyframe). The wrapper is absolute/clipped so it never leaks out of the
// hero or blocks clicks.
const BackgroundAnimations = () => {
  const reduceMotion = useReducedMotion();

  const words = useMemo(() => {
    const count = window.innerWidth < 768 ? 6 : 22;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      word: pick(),
      left: Math.random() * 95,
      size: 14 + Math.random() * 14, // 14–28px
      duration: 14 + Math.random() * 8, // 14–22s
      // Negative offset so each word starts mid-flight: the screen is full of
      // rain from the first frame instead of building up.
      offset: Math.random(),
      // Used only for the static (reduced-motion) scatter.
      top: 4 + Math.random() * 88,
    }));
  }, [reduceMotion]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {words.map((w) =>
        reduceMotion ? (
          <span
            key={w.id}
            className="absolute font-black text-fjalingo-green/30 select-none"
            style={{ left: `${w.left}%`, top: `${w.top}%`, fontSize: `${w.size}px` }}
          >
            {w.word}
          </span>
        ) : (
          <span
            key={w.id}
            className="absolute top-0 font-black text-fjalingo-green/40 select-none animate-fall"
            style={{
              left: `${w.left}%`,
              fontSize: `${w.size}px`,
              animationDuration: `${w.duration}s`,
              animationDelay: `-${(w.offset * w.duration).toFixed(2)}s`,
            }}
          >
            {w.word}
          </span>
        )
      )}
    </div>
  );
};

export default BackgroundAnimations;
