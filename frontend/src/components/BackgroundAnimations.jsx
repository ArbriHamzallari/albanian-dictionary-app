import { useEffect, useState, useMemo } from 'react';

const WORDS = ['shqip', 'gjuhë', 'fjalë', 'mëso', 'argëto', 'dije', 'libër', 'shkruaj', 'lexo', 'zbulo', 'flamur', 'atdhe', 'bukur', 'dashuri', 'jetë'];

const FallingWord = ({ word, delay, left, duration, size }) => (
  <div
    className="absolute text-fjalingo-green/10 dark:text-fjalingo-green/5 font-black pointer-events-none select-none animate-fall"
    style={{
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      fontSize: `${size}px`,
      top: '-40px',
    }}
  >
    {word}
  </div>
);

const BackgroundAnimations = () => {
  const [showBird, setShowBird] = useState(false);
  const [birdKey, setBirdKey] = useState(0);

  const fallingWords = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      word: WORDS[Math.floor(Math.random() * WORDS.length)],
      delay: Math.random() * 20,
      left: Math.random() * 90 + 5,
      duration: 12 + Math.random() * 10,
      size: 14 + Math.random() * 16,
    }));
  }, []);

  useEffect(() => {
    // Check for reduced motion preference or mobile
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 768) return;

    const birdInterval = setInterval(() => {
      setShowBird(true);
      setBirdKey((k) => k + 1);
      setTimeout(() => setShowBird(false), 15000);
    }, 45000);

    // Show first bird after 10 seconds
    const firstBird = setTimeout(() => {
      setShowBird(true);
      setBirdKey((k) => k + 1);
      setTimeout(() => setShowBird(false), 15000);
    }, 10000);

    return () => {
      clearInterval(birdInterval);
      clearTimeout(firstBird);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Falling words */}
      {fallingWords.map((fw) => (
        <FallingWord key={fw.id} {...fw} />
      ))}

      {/* Flying bird */}
      {showBird && (
        <div
          key={birdKey}
          className="absolute text-4xl animate-fly pointer-events-none"
          style={{ top: `${15 + Math.random() * 30}%` }}
        >
          🦅
        </div>
      )}
    </div>
  );
};

export default BackgroundAnimations;
