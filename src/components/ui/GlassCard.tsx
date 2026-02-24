import { motion } from 'framer-motion';
import clsx from 'clsx';

interface GlassCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  animate?: boolean;
  hover?: boolean;
}

export default function GlassCard({
  children,
  className,
  animate = true,
  hover = false,
  ...props
}: GlassCardProps) {
  const cardClassName = clsx(
    'rounded-[24px] border border-white/[0.04]',
    'bg-[#121214]',
    'shadow-[0_8px_32px_rgba(0,0,0,0.6)]',
    'transition-colors duration-300',
    hover && 'cursor-pointer hover:bg-[#18181A]',
    className
  );

  if (!animate) {
    return (
      <div className={cardClassName} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cardClassName}
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      style={{ willChange: 'transform, opacity' }}
      whileHover={hover ? { scale: 1.015, transition: { type: 'spring', bounce: 0, duration: 0.4 } } : undefined}
      whileTap={hover ? { scale: 0.98, transition: { type: 'spring', bounce: 0, duration: 0.4 } } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
