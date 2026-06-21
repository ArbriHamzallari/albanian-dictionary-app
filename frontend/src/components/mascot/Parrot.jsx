import { useEffect, useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const SPRING = { type: 'spring', stiffness: 300, damping: 22 };
const SPRING_BOUNCY = { type: 'spring', stiffness: 400, damping: 15 };

const PARROT_STATES = [
  'idle',
  'wave',
  'cheer',
  'think',
  'sleep',
  'streak-fire',
  'celebrate-big',
];

const STROKE = 'var(--brand-green-dark)';
const BELLY = 'color-mix(in srgb, var(--brand-green) 72%, var(--accent-yellow))';

const Eyes = ({ open, lookUp = false }) => {
  if (!open) {
    return (
      <>
        <path d="M88 108 Q98 102 108 108" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M132 108 Q142 102 152 108" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </>
    );
  }

  const pupilOffset = lookUp ? -3 : 0;

  return (
    <>
      <ellipse cx="98" cy="108" rx="22" ry="24" fill="var(--paper)" stroke={STROKE} strokeWidth="2" />
      <ellipse cx="142" cy="108" rx="22" ry="24" fill="var(--paper)" stroke={STROKE} strokeWidth="2" />
      <path d="M82 92 Q98 84 114 92" stroke={STROKE} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M126 92 Q142 84 158 92" stroke={STROKE} strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx={98} cy={108 + pupilOffset} r="9" fill="var(--ink)" />
      <circle cx={142} cy={108 + pupilOffset} r="9" fill="var(--ink)" />
      <circle cx={102} cy={104 + pupilOffset} r="3.5" fill="var(--paper)" />
      <circle cx={146} cy={104 + pupilOffset} r="3.5" fill="var(--paper)" />
    </>
  );
};

const Sparkle = ({ x, y, delay = 0, reduceMotion }) => (
  <motion.span
    className="absolute text-accent-yellow text-xl pointer-events-none select-none"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0 }}
    animate={
      reduceMotion
        ? { opacity: 0.8, scale: 1 }
        : { opacity: [0, 1, 0], scale: [0, 1.2, 0], rotate: [0, 20, 0] }
    }
    transition={{ duration: 0.45, delay, ...SPRING }}
  >
    ✦
  </motion.span>
);

const Flame = ({ reduceMotion }) => (
  <motion.span
    className="absolute -right-1 top-4 text-2xl"
    animate={reduceMotion ? { opacity: 1 } : { scale: [1, 1.15, 1], rotate: [-4, 4, -4] }}
    transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
    aria-hidden="true"
  >
    🔥
  </motion.span>
);

const Crown = ({ reduceMotion }) => (
  <motion.span
    className="absolute left-1/2 -translate-x-1/2 -top-5 text-3xl"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: reduceMotion ? 0 : [-2, 0, -2] }}
    transition={{ duration: 0.4, repeat: reduceMotion ? 0 : Infinity, repeatDelay: 0.8 }}
    aria-hidden="true"
  >
    👑
  </motion.span>
);

const useBlink = (enabled, reduceMotion) => {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (!enabled || reduceMotion) return undefined;

    const blink = () => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
    };

    const interval = setInterval(blink, 4000);
    return () => clearInterval(interval);
  }, [enabled, reduceMotion]);

  return blinking;
};

const Parrot = ({
  state = 'idle',
  size = 200,
  className = '',
  label = 'Papagalli Fjalingo',
  correctionText,
}) => {
  const reduceMotion = useReducedMotion();
  const activeState = PARROT_STATES.includes(state) ? state : 'idle';
  const shouldBlink = activeState === 'idle';
  const blinking = useBlink(shouldBlink, reduceMotion);
  const eyesOpen = activeState !== 'sleep' && !blinking;
  const lookUp = activeState === 'think';

  useEffect(() => {
    if (activeState !== 'celebrate-big' || reduceMotion) return undefined;

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.55 },
      colors: ['#2BB673', '#FFC93C', '#FF7A6B', '#8B7FF5'],
      disableForReducedMotion: true,
    });
  }, [activeState, reduceMotion]);

  const containerVariants = {
    idle: reduceMotion ? {} : { y: [0, -6, 0, -4, 0] },
    wave: {},
    cheer: reduceMotion ? {} : { y: [0, -18, 0, -10, 0], scale: [1, 1.05, 1] },
    think: reduceMotion ? {} : { rotate: [-2, 2, 0] },
    sleep: reduceMotion ? {} : { y: [0, 3, 0] },
    'streak-fire': reduceMotion ? {} : { y: [0, -4, 0] },
    'celebrate-big': reduceMotion ? {} : { y: [0, -22, 0], scale: [1, 1.08, 1] },
  };

  const containerTransition = {
    idle: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
    wave: {},
    cheer: { duration: 0.45, ...SPRING_BOUNCY },
    think: { duration: 0.4, ...SPRING },
    sleep: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    'streak-fire': { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
    'celebrate-big': { duration: 0.5, ...SPRING_BOUNCY },
  };

  const wingLeftVariants = {
    idle: {},
    wave: reduceMotion ? {} : { rotate: [0, -38, 0], transformOrigin: '78px 178px' },
    cheer: reduceMotion ? {} : { rotate: [0, -32, 0], transformOrigin: '78px 178px' },
    think: reduceMotion ? {} : { rotate: -62, x: 36, y: -78, transformOrigin: '78px 178px' },
    sleep: {},
    'streak-fire': {},
    'celebrate-big': reduceMotion ? {} : { rotate: [0, -40, 0], transformOrigin: '78px 178px' },
  };

  const wingLeftTransition = {
    idle: {},
    wave: { duration: 0.4, repeat: Infinity, repeatDelay: 0.15, ...SPRING },
    cheer: { duration: 0.35, repeat: 2, ...SPRING_BOUNCY },
    think: { duration: 0.35, ...SPRING },
    sleep: {},
    'streak-fire': {},
    'celebrate-big': { duration: 0.35, repeat: 2, ...SPRING_BOUNCY },
  };

  const wingRightVariants = {
    cheer: reduceMotion ? {} : { rotate: [0, 28, 0], transformOrigin: '162px 178px' },
    'celebrate-big': reduceMotion ? {} : { rotate: [0, 32, 0], transformOrigin: '162px 178px' },
  };

  const wingRightTransition = {
    cheer: { duration: 0.35, repeat: 2, ...SPRING_BOUNCY },
    'celebrate-big': { duration: 0.35, repeat: 2, ...SPRING_BOUNCY },
  };

  const headVariants = {
    think: reduceMotion ? {} : { rotate: -6, transformOrigin: '120px 140px' },
    sleep: reduceMotion ? {} : { rotate: 8, transformOrigin: '120px 140px' },
  };

  const headTransition = {
    think: { duration: 0.35, ...SPRING },
    sleep: { duration: 0.4, ...SPRING },
  };

  const thinkBubbleText = correctionText ?? '';

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size * 1.17 }}
      role="img"
      aria-label={label}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeState}
          className="relative w-full h-full"
          initial={{ opacity: reduceMotion ? 0 : 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reduceMotion ? 0 : 1 }}
          transition={{ duration: reduceMotion ? 0.2 : 0 }}
        >
          {activeState === 'celebrate-big' && <Crown reduceMotion={reduceMotion} />}
          {activeState === 'streak-fire' && <Flame reduceMotion={reduceMotion} />}

          <motion.div
            className="w-full h-full"
            animate={containerVariants[activeState] ?? {}}
            transition={containerTransition[activeState] ?? SPRING}
          >
            <svg viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
              <g>
                <ellipse cx="72" cy="228" rx="14" ry="28" fill="#4DA3FF" stroke={STROKE} strokeWidth="2" transform="rotate(-28 72 228)" />
                <ellipse cx="58" cy="242" rx="13" ry="26" fill="var(--accent-yellow)" stroke={STROKE} strokeWidth="2" transform="rotate(-38 58 242)" />
                <ellipse cx="48" cy="258" rx="12" ry="24" fill="var(--accent-coral)" stroke={STROKE} strokeWidth="2" transform="rotate(-48 48 258)" />
              </g>

              <ellipse cx="120" cy="178" rx="58" ry="64" fill="var(--brand-green)" stroke={STROKE} strokeWidth="2.5" />
              <ellipse cx="120" cy="188" rx="34" ry="38" fill={BELLY} />

              <motion.g
                animate={wingRightVariants[activeState] ?? {}}
                transition={wingRightTransition[activeState] ?? SPRING}
              >
                <path
                  d="M162 168 C178 158 188 178 182 198 C176 214 162 208 156 192 Z"
                  fill="var(--brand-green)"
                  stroke={STROKE}
                  strokeWidth="2.5"
                />
                <path d="M166 176 C174 172 178 184 174 194 C170 202 164 198 162 188 Z" fill={BELLY} stroke={STROKE} strokeWidth="1.5" />
              </motion.g>

              <motion.g
                animate={wingLeftVariants[activeState] ?? {}}
                transition={wingLeftTransition[activeState] ?? SPRING}
              >
                <path
                  d="M78 168 C62 158 52 178 58 198 C64 214 78 208 84 192 Z"
                  fill="var(--brand-green)"
                  stroke={STROKE}
                  strokeWidth="2.5"
                />
                <path d="M74 176 C66 172 62 184 66 194 C70 202 76 198 78 188 Z" fill={BELLY} stroke={STROKE} strokeWidth="1.5" />
                <path d="M70 184 C64 182 60 190 64 198 C68 204 74 200 74 192 Z" fill="var(--accent-yellow)" stroke={STROKE} strokeWidth="1.5" opacity="0.85" />
              </motion.g>

              <g>
                <ellipse cx="98" cy="248" rx="14" ry="8" fill="var(--accent-coral)" stroke={STROKE} strokeWidth="2" />
                <ellipse cx="142" cy="248" rx="14" ry="8" fill="var(--accent-coral)" stroke={STROKE} strokeWidth="2" />
              </g>

              <motion.g
                animate={headVariants[activeState] ?? {}}
                transition={headTransition[activeState] ?? SPRING}
              >
                <ellipse cx="120" cy="108" rx="62" ry="58" fill="var(--brand-green)" stroke={STROKE} strokeWidth="2.5" />
                <ellipse cx="120" cy="118" rx="36" ry="32" fill={BELLY} opacity="0.55" />
                <ellipse cx="108" cy="58" rx="8" ry="12" fill="var(--brand-green)" stroke={STROKE} strokeWidth="2" />
                <ellipse cx="120" cy="52" rx="9" ry="14" fill="var(--brand-green)" stroke={STROKE} strokeWidth="2" />
                <ellipse cx="132" cy="58" rx="8" ry="12" fill="var(--brand-green)" stroke={STROKE} strokeWidth="2" />
                <path
                  d="M120 128 C108 134 106 148 120 156 C134 148 132 134 120 128 Z"
                  fill="var(--accent-yellow)"
                  stroke={STROKE}
                  strokeWidth="2.5"
                />
                <path d="M120 140 C114 144 114 150 120 152 C126 150 126 144 120 140 Z" fill="var(--accent-coral)" />
                <Eyes open={eyesOpen} lookUp={lookUp} />
              </motion.g>

              {activeState === 'think' && (
                <g>
                  <circle cx="198" cy="88" r="28" fill="var(--paper)" stroke={STROKE} strokeWidth="2.5" />
                  <path d="M172 98 L182 108 L168 112 Z" fill="var(--paper)" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
                  {thinkBubbleText && (
                    <text x="198" y="93" textAnchor="middle" fill="var(--ink-soft)" fontSize="11" fontWeight="600" fontFamily="Nunito, sans-serif">
                      {thinkBubbleText}
                    </text>
                  )}
                </g>
              )}
            </svg>
          </motion.div>

          {(activeState === 'cheer' || activeState === 'celebrate-big') && !reduceMotion && (
            <>
              <Sparkle x="8%" y="12%" delay={0} reduceMotion={reduceMotion} />
              <Sparkle x="78%" y="8%" delay={0.1} reduceMotion={reduceMotion} />
              <Sparkle x="85%" y="45%" delay={0.2} reduceMotion={reduceMotion} />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Parrot;
export { PARROT_STATES };
