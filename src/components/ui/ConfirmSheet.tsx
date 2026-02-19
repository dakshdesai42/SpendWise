import { motion, AnimatePresence } from 'framer-motion';

/**
 * Native-feeling iOS-style action sheet for confirmations.
 * Usage:
 *   <ConfirmSheet
 *     isOpen={showConfirm}
 *     title="Delete Expense?"
 *     message="This can't be undone."
 *     confirmLabel="Delete"
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowConfirm(false)}
 *     danger
 *   />
 */
export default function ConfirmSheet({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  danger = false,
}: {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            className="relative w-full max-w-sm mb-4 rounded-2xl overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 32 } }}
            exit={{ y: 40, opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
          >
            {/* Info card */}
            <div className="bg-bg-secondary/98 border border-white/[0.10] rounded-2xl p-5 mb-2 text-center">
              {title && (
                <p className="text-sm font-semibold text-text-primary mb-1">{title}</p>
              )}
              {message && (
                <p className="text-xs text-text-tertiary">{message}</p>
              )}
            </div>

            {/* Action buttons stacked */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { onConfirm(); onCancel(); }}
                className={`w-full py-4 rounded-2xl text-sm font-semibold transition-opacity active:opacity-70 ${danger
                  ? 'bg-danger/90 text-white'
                  : 'bg-accent-primary/90 text-white'
                  }`}
              >
                {confirmLabel}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-4 rounded-2xl text-sm font-semibold bg-bg-secondary/98 border border-white/[0.10] text-text-primary transition-opacity active:opacity-70"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
