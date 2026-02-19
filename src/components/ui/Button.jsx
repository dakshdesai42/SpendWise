import { motion } from 'framer-motion';
import clsx from 'clsx';

const variants = {
  primary:
    'bg-accent-primary hover:bg-accent-primary/95 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_16px_rgba(10,132,255,0.35)]',
  secondary:
    'bg-white/[0.08] hover:bg-white/[0.12] text-text-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.1)] border border-white/[0.05]',
  danger:
    'bg-danger/90 hover:bg-danger text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_16px_rgba(255,69,58,0.3)]',
  ghost:
    'bg-transparent hover:bg-white/[0.08] text-text-secondary hover:text-text-primary',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-2xl',
  lg: 'px-6 py-3 text-base rounded-2xl',
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
      whileHover={!disabled ? { scale: 1.02, transition: { type: 'spring', bounce: 0, duration: 0.4 } } : undefined}
      whileTap={!disabled ? { scale: 0.96, transition: { type: 'spring', bounce: 0, duration: 0.4 } } : undefined}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium leading-none transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
        variants[variant],
        sizes[size],
        (disabled || loading) && 'opacity-55 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24">
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
        <span className="inline-flex items-center justify-center w-4 h-4 shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}
