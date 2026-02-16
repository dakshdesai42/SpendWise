import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { modalOverlayVariants, modalContentVariants } from '../../utils/animations';
import { HiXMark } from 'react-icons/hi2';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          {...modalOverlayVariants}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Content */}
          <motion.div
            className={`relative w-full ${sizeClasses[size]} rounded-2xl border border-white/[0.08] bg-bg-secondary p-6 shadow-2xl`}
            {...modalContentVariants}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
                >
                  <HiXMark className="w-5 h-5" />
                </button>
              </div>
            )}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
