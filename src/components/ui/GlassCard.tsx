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
    'rounded-3xl',
    'bg-[#1C1C1E]/60 backdrop-blur-[24px] saturate-[1.8]',
    'shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.4)]',
    'transition-colors duration-300',
    hover && 'cursor-pointer hover:bg-[#2C2C2E]/60',
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
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
      whileHover={hover ? { scale: 1.015, transition: { type: 'spring', bounce: 0, duration: 0.4 } } : undefined}
      whileTap={hover ? { scale: 0.98, transition: { type: 'spring', bounce: 0, duration: 0.4 } } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
