import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef, useCallback } from 'react';
import { HiXMark } from 'react-icons/hi2';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; }) {
  const dragY = useMotionValue(0);
  const opacity = useTransform(dragY, [0, 260], [1, 0]);
  const contentRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStartedFromHandle = useRef(false);

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

  // Reset drag position when reopened
  useEffect(() => {
    if (isOpen) dragY.set(0);
  }, [isOpen]);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) {
    if (dragStartedFromHandle.current && (info.offset.y > 100 || info.velocity.y > 600)) {
      onClose();
    } else {
      dragY.set(0);
    }
    dragStartedFromHandle.current = false;
  }

  // Only allow drag-to-dismiss when the gesture starts from the drag handle
  // or when the content is scrolled to the top. This prevents accidental
  // dismisses when the user is scrolling inside the modal on iOS.
  const handlePointerDownOnSheet = useCallback((e: React.PointerEvent) => {
    const handle = handleRef.current;
    const content = contentRef.current;
    const target = e.target as Node;

    // If the touch started on the drag handle, always allow drag
    if (handle && handle.contains(target)) {
      dragStartedFromHandle.current = true;
      return;
    }

    // If content is scrolled to top (or not scrollable), allow drag
    if (content && content.scrollTop <= 0) {
      dragStartedFromHandle.current = true;
      return;
    }

    // Otherwise block the drag — user is scrolling content
    dragStartedFromHandle.current = false;
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            style={{ opacity }}
          />

          {/* Sheet — mobile: drag-to-dismiss; desktop: centered */}
          <motion.div
            className={`relative w-full ${sizeClasses[size]} md:mx-4 rounded-t-3xl md:rounded-2xl border border-white/[0.10] bg-bg-secondary/96 shadow-2xl flex flex-col`}
            style={{ y: dragY, maxHeight: '92dvh' }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 340, damping: 34, mass: 0.9 } }}
            exit={{ y: '100%', opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            dragListener={true}
            onPointerDown={handlePointerDownOnSheet}
          >
            {/* Drag handle — mobile only */}
            <div ref={handleRef} className="md:hidden flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 pt-3 pb-4 md:px-6 md:pt-5 shrink-0">
                <h2 className="text-base md:text-lg font-semibold text-text-primary">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/35"
                  aria-label="Close modal"
                >
                  <HiXMark className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Scrollable body */}
            <div
              ref={contentRef}
              className="overflow-y-auto overscroll-contain px-5 pb-6 md:px-6 md:pb-7"
              style={{ paddingBottom: 'calc(1.5rem + var(--safe-area-bottom))' }}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
