import { AlertCircle } from 'lucide-react';

const ErrorMessage = ({ message }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-3 bg-fjalingo-red/10 border-2 border-fjalingo-red/20 text-fjalingo-red px-5 py-4 rounded-2xl font-semibold">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
};

export default ErrorMessage;
