import { useReducedMotion } from 'framer-motion';

// Soft blurred brand blobs for the hero background. Colors are the brand palette
// (BR-0): green #2BB673, fjalingo-blue, accent-yellow, accent-purple. Under
// prefers-reduced-motion the blobs stay (they're static decoration) but their
// float animation is dropped.
const AnimatedBackground = () => {
  const reduceMotion = useReducedMotion();
  const float = (value) => (reduceMotion ? undefined : value);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-[0.20] dark:opacity-[0.12]"
        style={{
          background: 'radial-gradient(circle, rgba(43,182,115,0.45), transparent 70%)',
          top: '-10%',
          left: '-5%',
          animation: float('blobFloat1 32s ease-in-out infinite'),
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full blur-3xl opacity-[0.20] dark:opacity-[0.12]"
        style={{
          background: 'radial-gradient(circle, rgba(28,176,246,0.35), transparent 70%)',
          top: '10%',
          right: '-10%',
          animation: float('blobFloat2 36s ease-in-out infinite'),
        }}
      />
      <div
        className="absolute w-64 h-64 rounded-full blur-3xl opacity-[0.16] dark:opacity-[0.10]"
        style={{
          background: 'radial-gradient(circle, rgba(255,201,60,0.32), transparent 70%)',
          bottom: '-15%',
          left: '20%',
          animation: float('blobFloat3 28s ease-in-out infinite'),
        }}
      />
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-[0.16] dark:opacity-[0.10]"
        style={{
          background: 'radial-gradient(circle, rgba(139,127,245,0.30), transparent 70%)',
          bottom: '-10%',
          right: '15%',
          animation: float('blobFloat4 40s ease-in-out infinite'),
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
