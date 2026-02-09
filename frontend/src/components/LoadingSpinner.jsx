const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="h-10 w-10 rounded-full border-4 border-fjalingo-green border-t-transparent animate-spin" />
      <p className="text-sm font-semibold text-muted dark:text-dark-muted">Duke ngarkuar...</p>
    </div>
  );
};

export default LoadingSpinner;
