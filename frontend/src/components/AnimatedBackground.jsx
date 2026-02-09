const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* Soft blurred blobs */}
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-[0.12] dark:opacity-[0.08]"
        style={{
          background: 'radial-gradient(circle, rgba(88,204,2,0.4), transparent 70%)',
          top: '-10%',
          left: '-5%',
          animation: 'blobFloat1 32s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full blur-3xl opacity-[0.12] dark:opacity-[0.08]"
        style={{
          background: 'radial-gradient(circle, rgba(28,176,246,0.35), transparent 70%)',
          top: '10%',
          right: '-10%',
          animation: 'blobFloat2 36s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-64 h-64 rounded-full blur-3xl opacity-[0.1] dark:opacity-[0.06]"
        style={{
          background: 'radial-gradient(circle, rgba(255,200,0,0.3), transparent 70%)',
          bottom: '-15%',
          left: '20%',
          animation: 'blobFloat3 28s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-[0.1] dark:opacity-[0.06]"
        style={{
          background: 'radial-gradient(circle, rgba(206,130,255,0.3), transparent 70%)',
          bottom: '-10%',
          right: '15%',
          animation: 'blobFloat4 40s ease-in-out infinite',
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
