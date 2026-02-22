import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        className={`${sizes[size]} rounded-full border-2 border-white/10 border-t-accent-primary`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export function FullPageLoader({
  message = 'Loading your data...',
}: {
  state?: 'auth_loading' | 'auth_required' | 'data_loading' | 'ready' | 'error';
  message?: string;
}) {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-4xl font-bold gradient-text"
      >
        SpendWise
      </motion.div>
      <LoadingSpinner size="md" />
      <p className="text-text-tertiary text-sm">{message}</p>
    </div>
  );
}
