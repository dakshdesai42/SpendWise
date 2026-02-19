import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function GlassCard({ children, className, animate = true, hover = false, ...props }) {
  const Component = animate ? motion.div : 'div';

  const animationProps = animate
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: 'easeOut' },
      }
    : {};

  const hoverProps = hover
    ? {
        whileHover: { y: -2, transition: { type: 'spring', stiffness: 260, damping: 20 } },
      }
    : {};

  return (
    <Component
      className={clsx(
        'rounded-2xl border border-white/[0.12]',
        'bg-white/[0.065] backdrop-blur-xl',
        'shadow-xl shadow-black/20',
        'transition-colors duration-200',
        hover && 'cursor-pointer hover:bg-white/[0.09]',
        className
      )}
      {...animationProps}
      {...hoverProps}
      {...props}
    >
      {children}
    </Component>
  );
}
