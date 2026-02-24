import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hapticWarning, hapticHeavy } from '../../utils/haptics';

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
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmEnabled, setConfirmEnabled] = useState(false);

  // Haptic warning on open + delay before enabling confirm button
  useEffect(() => {
    if (!isOpen) {
      setConfirmEnabled(false);
      return;
    }
    hapticWarning();
    const timer = window.setTimeout(() => setConfirmEnabled(true), 400);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  async function handleConfirm() {
    if (!confirmEnabled) return;
    hapticHeavy();
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      onCancel();
    }
  }

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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={busy ? undefined : onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ marginBottom: 'max(1rem, env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 32 } }}
            exit={{ y: 40, opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
          >
            {/* Info card */}
            <div className="bg-[#1C1C1E]/80 backdrop-blur-[40px] border border-white/[0.04] rounded-[14px] p-5 mb-2 text-center shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
              {title && (
                <p className="text-[13px] font-semibold text-white/50 mb-1">{title}</p>
              )}
              {message && (
                <p className="text-[13px] text-white/40">{message}</p>
              )}
            </div>

            {/* Action buttons stacked */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirm}
                disabled={busy || !confirmEnabled}
                className={danger
                  ? "w-full py-4 rounded-[14px] text-[17px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 bg-[#1C1C1E]/80 backdrop-blur-[40px] border border-white/[0.04] text-[#FF453A]"
                  : "w-full py-4 rounded-[14px] text-[17px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 bg-[#1C1C1E]/80 backdrop-blur-[40px] border border-white/[0.04] text-[#2D8CFF]"
                }
              >
                {busy ? 'Deleting…' : confirmLabel}
              </button>
              <button
                onClick={onCancel}
                disabled={busy}
                className="w-full py-4 rounded-[14px] text-[17px] font-semibold bg-[#1C1C1E]/80 backdrop-blur-[40px] border border-white/[0.04] text-[#2D8CFF] transition-all active:scale-[0.98] disabled:opacity-50"
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
