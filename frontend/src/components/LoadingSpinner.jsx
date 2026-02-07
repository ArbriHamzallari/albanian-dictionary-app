const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
};

export default LoadingSpinner;
