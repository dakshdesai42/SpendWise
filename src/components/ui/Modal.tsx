import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from 'framer-motion';
import { useEffect, useRef, useCallback, useState } from 'react';
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
  const dragControls = useDragControls();
  const opacity = useTransform(dragY, [0, 260], [1, 0]);
  const contentRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const focusScrollTimerRef = useRef<number | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const postNativeModalVisibility = useCallback((open: boolean) => {
    const webkitBridge = (
      window as typeof window & {
        webkit?: {
          messageHandlers?: Record<string, { postMessage: (payload: unknown) => void }>;
        };
      }
    ).webkit;
    webkitBridge?.messageHandlers?.spendwiseModal?.postMessage(open);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const activeLocks = Number(root.dataset.modalLocks || '0');

    if (!isOpen) {
      return;
    }

    if (activeLocks === 0) {
      root.dataset.modalScrollY = String(window.scrollY || 0);
      body.style.position = 'fixed';
      body.style.top = `-${root.dataset.modalScrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      root.classList.add('modal-open');
    }

    root.dataset.modalLocks = String(activeLocks + 1);

    return () => {
      const currentLocks = Number(root.dataset.modalLocks || '0');
      const nextLocks = Math.max(0, currentLocks - 1);
      root.dataset.modalLocks = String(nextLocks);

      if (nextLocks > 0) return;

      const scrollY = Number(root.dataset.modalScrollY || '0');
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      root.classList.remove('modal-open');
      window.scrollTo(0, scrollY);
      delete root.dataset.modalScrollY;
    };
  }, [isOpen]);

  useEffect(() => {
    postNativeModalVisibility(isOpen);
  }, [isOpen, postNativeModalVisibility]);

  useEffect(() => {
    return () => {
      postNativeModalVisibility(false);
    };
  }, [postNativeModalVisibility]);

  // Reset drag position when reopened
  useEffect(() => {
    if (isOpen) dragY.set(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setKeyboardInset(0);
      return;
    }

    const viewport = window.visualViewport;

    // Primary path: visualViewport API (supported on iOS 13+, all modern browsers)
    if (viewport) {
      const updateInset = () => {
        const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
        setKeyboardInset(Math.round(inset));
      };

      updateInset();
      viewport.addEventListener('resize', updateInset);
      viewport.addEventListener('scroll', updateInset);
      window.addEventListener('orientationchange', updateInset);

      return () => {
        viewport.removeEventListener('resize', updateInset);
        viewport.removeEventListener('scroll', updateInset);
        window.removeEventListener('orientationchange', updateInset);
      };
    }

    // Fallback: estimate keyboard height from focus events (older WebViews)
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        setKeyboardInset(Math.round(window.innerHeight * 0.4));
      }
    };
    const handleFocusOut = () => {
      setKeyboardInset(0);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (focusScrollTimerRef.current) {
        window.clearTimeout(focusScrollTimerRef.current);
      }
    };
  }, []);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) {
    if (info.offset.y > 100 || info.velocity.y > 600) {
      onClose();
    } else {
      dragY.set(0);
    }
  }

  const ensureFocusedFieldVisible = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLTextAreaElement) &&
      !(target instanceof HTMLSelectElement) &&
      !(target instanceof HTMLButtonElement)
    ) {
      return;
    }

    if (focusScrollTimerRef.current) {
      window.clearTimeout(focusScrollTimerRef.current);
    }

    focusScrollTimerRef.current = window.setTimeout(() => {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }, 120);
  }, []);

  const contentBottomPadding = `calc(1.5rem + var(--safe-area-bottom) + ${keyboardInset}px)`;

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
            onTouchMove={(e) => e.preventDefault()}
            style={{ opacity }}
          />

          {/* Sheet — mobile: drag-to-dismiss; desktop: centered */}
          <motion.div
            className={`relative w-full ${sizeClasses[size]} md:mx-4 rounded-t-[32px] md:rounded-[32px] border border-white/[0.04] bg-[#121214] shadow-[0_-8px_40px_rgba(0,0,0,0.8)] flex flex-col`}
            style={{
              y: dragY,
              maxHeight: 'calc(100dvh - var(--safe-area-top) - 0.35rem)',
            }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 38, mass: 0.8 } }}
            exit={{ y: '100%', opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } }}
            drag={keyboardInset > 0 ? false : 'y'}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            dragListener={false}
          >
            {/* Drag handle — mobile only */}
            <div
              ref={handleRef}
              onPointerDown={(e) => {
                if (keyboardInset > 0) return;
                dragControls.start(e);
              }}
              className="md:hidden flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none"
            >
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
              style={{
                paddingBottom: contentBottomPadding,
                scrollPaddingBottom: contentBottomPadding,
                WebkitOverflowScrolling: 'touch',
              }}
              onFocusCapture={ensureFocusedFieldVisible}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
