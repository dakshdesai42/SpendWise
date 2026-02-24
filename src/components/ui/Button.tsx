import { motion } from 'framer-motion';
import clsx from 'clsx';

const variants = {
  primary:
    'bg-[#2D8CFF] hover:bg-[#1C7AE5] text-white shadow-[0_8px_32px_-4px_rgba(45,140,255,0.6)]',
  secondary:
    'bg-[#18181A] hover:bg-[#202022] text-white/90 border border-white/[0.06] shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
  danger:
    'bg-[#FF453A]/10 hover:bg-[#FF453A]/20 text-[#FF453A] border border-[#FF453A]/20 shadow-[0_0_24px_rgba(255,69,58,0.2)]',
  ghost:
    'bg-transparent hover:bg-white/[0.04] text-white/50 hover:text-white',
};

const sizes = {
  sm: 'px-4 py-2 text-[13px] rounded-full min-h-10',
  md: 'px-5 py-2.5 text-[14px] rounded-full min-h-11',
  lg: 'px-6 py-3.5 text-[15px] rounded-[20px] min-h-[52px]',
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
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'>) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02, transition: { type: 'spring', bounce: 0, duration: 0.4 } } : undefined}
      whileTap={!disabled ? { scale: 0.96, transition: { type: 'spring', bounce: 0, duration: 0.4 } } : undefined}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium leading-none transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D8CFF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214]',
        variants[variant],
        sizes[size],
        (disabled || loading) && 'opacity-55 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
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
