import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function GlassCard({ children, className, animate = true, hover = false, ...props }) {
  const Component = animate ? motion.div : 'div';

  const animationProps = animate
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' },
      }
    : {};

  const hoverProps = hover
    ? {
        whileHover: { scale: 1.02, transition: { type: 'spring', stiffness: 300 } },
      }
    : {};

  return (
    <Component
      className={clsx(
        'rounded-2xl border border-white/[0.10]',
        'bg-white/[0.06] backdrop-blur-xl',
        'p-6 shadow-xl shadow-black/25',
        hover && 'cursor-pointer transition-colors duration-300 hover:bg-white/[0.10]',
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
