import { motion } from 'framer-motion';
import clsx from 'clsx';

const variants = {
  primary:
    'bg-accent-primary hover:bg-accent-primary/80 text-white shadow-lg shadow-accent-primary/25',
  secondary:
    'bg-white/[0.06] hover:bg-white/[0.12] text-text-primary border border-white/[0.08]',
  danger:
    'bg-danger/20 hover:bg-danger/30 text-danger border border-danger/20',
  ghost:
    'bg-transparent hover:bg-white/[0.06] text-text-secondary hover:text-text-primary',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  disabled = false,
  icon,
  ...props
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200',
        variants[variant],
        sizes[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : icon ? (
        <span className="text-lg">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}
