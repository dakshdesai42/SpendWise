export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const pageTransition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.28,
};

export const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

export const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

export const slideUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export const cardHover = {
  scale: 1.02,
  transition: { type: 'spring', stiffness: 300 },
};

export const successVariants = {
  initial: { scale: 0, rotate: -180 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 200, damping: 15 },
  },
};

export const barFillVariants = {
  initial: { width: 0 },
  animate: (percent) => ({
    width: `${Math.min(percent, 100)}%`,
    transition: { duration: 0.8, ease: 'easeOut' },
  }),
};

export const modalOverlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContentVariants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: 'easeOut' } },
};
