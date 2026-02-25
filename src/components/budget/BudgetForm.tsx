import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../ui/Modal';
import { CATEGORIES, CURRENCY_MAP } from '../../utils/constants';
import { useCurrency } from '../../context/CurrencyContext';
import clsx from 'clsx';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';

/* ── Category row sub-component ─────────────────────────────── */

function CategoryRow({
  cat,
  value,
  onChange,
}: {
  cat: (typeof CATEGORIES)[number];
  value: number;
  onChange: (catId: string, val: number) => void;
}) {
  const [text, setText] = useState(value ? String(value) : '');

  // Sync from parent when form resets / step navigates
  useEffect(() => {
    setText(value ? String(value) : '');
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let val = e.target.value.replace(/,/g, '.').replace(/[^\d.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1]?.length > 2) val = `${parts[0]}.${parts[1].slice(0, 2)}`;
    setText(val);
    onChange(cat.id, parseFloat(val) || 0);
  }

  const hasValue = !!text && parseFloat(text) > 0;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-3 py-[7px] rounded-xl transition-colors',
        hasValue ? 'bg-white/[0.04]' : 'bg-transparent'
      )}
    >
      {/* Icon circle */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${cat.color}15` }}
      >
        <span className="text-sm">{cat.icon}</span>
      </div>

      {/* Label */}
      <span className="text-[14px] text-white/80 flex-1 truncate">{cat.label}</span>

      {/* Bare inline input */}
      <input
        type="text"
        inputMode="decimal"
        enterKeyHint="next"
        value={text}
        onChange={handleChange}
        placeholder="0"
        className="w-20 text-right bg-transparent text-[15px] text-white placeholder:text-white/25 focus:outline-none"
      />
    </div>
  );
}

/* ── Slide variants ─────────────────────────────────────────── */

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '30%' : '-30%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-30%' : '30%',
    opacity: 0,
  }),
};

const slideTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 36,
  mass: 0.8,
};

/* ── Main component ─────────────────────────────────────────── */

export default function BudgetForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { overall: number; categories: Record<string, number>; currency: string }) => Promise<void>;
  initialData?: { overall?: number; categories?: Record<string, number> } | null;
}) {
  const { hostCurrency } = useCurrency();
  const currencySymbol = CURRENCY_MAP[hostCurrency]?.symbol || hostCurrency;
  const isEditing = !!initialData?.overall;

  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [overall, setOverall] = useState('');
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  // Reset when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setDirection(1);
    setOverall(initialData?.overall?.toString() || '');
    setCategories(initialData?.categories ? { ...initialData.categories } : {});
    setLoading(false);
    setTimeout(() => amountRef.current?.focus(), 80);
  }, [isOpen]);

  /* ── Amount handling (matches ExpenseForm sanitization) ── */

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/,/g, '.').replace(/[^\d.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1]?.length > 2) val = `${parts[0]}.${parts[1].slice(0, 2)}`;
    if (val !== overall) {
      setOverall(val);
      if (val) hapticLight();
    }
  }, [overall]);

  const displayAmount = useMemo(() => {
    if (!overall) return '';
    const parts = overall.split('.');
    const intPart = parts[0] || '0';
    const num = parseInt(intPart, 10);
    const formattedInt = isNaN(num) ? '0' : new Intl.NumberFormat('en-US').format(num);
    const decPart = parts.length > 1 ? `.${parts[1].slice(0, 2)}` : '';
    return formattedInt + decPart;
  }, [overall]);

  const overallNum = parseFloat(overall) || 0;

  /* ── Category helpers ── */

  const allocatedTotal = useMemo(
    () => Object.values(categories).reduce((s, v) => s + (v || 0), 0),
    [categories]
  );

  const updateCategory = useCallback((catId: string, val: number) => {
    setCategories((prev) => ({ ...prev, [catId]: val }));
  }, []);

  const isOverAllocated = allocatedTotal > overallNum && overallNum > 0;

  /* ── Navigation ── */

  function goNext() {
    if (!overall || overallNum <= 0) return;
    hapticMedium();
    setDirection(1);
    setStep(2);
  }

  function goBack() {
    hapticLight();
    setDirection(-1);
    setStep(1);
  }

  /* ── Submit ── */

  async function handleSave() {
    if (!overall || overallNum <= 0) return;
    setLoading(true);
    try {
      hapticSuccess();
      await onSubmit({ overall: overallNum, categories, currency: hostCurrency });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    hapticLight();
    setCategories({});
    // Save with empty categories
    setLoading(true);
    onSubmit({ overall: overallNum, categories: {}, currency: hostCurrency })
      .then(() => onClose())
      .finally(() => setLoading(false));
  }

  /* ── Allocation bar formatter ── */
  const formatCompact = (n: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="pt-2 pb-2">
        {/* Step indicator dots */}
        <div className="flex justify-center gap-2 mb-3">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={clsx(
                'w-2 h-2 rounded-full transition-colors duration-300',
                s === step ? 'bg-[#2D8CFF]' : 'bg-white/15'
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 ? (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
            >
              {/* Title */}
              <h2 className="text-[17px] font-semibold tracking-tight text-white text-center mb-1">
                {isEditing ? 'Edit Budget' : 'Set Monthly Budget'}
              </h2>

              {isEditing && initialData?.overall && (
                <p className="text-[13px] text-white/40 text-center mb-2">
                  Current: {currencySymbol}{formatCompact(initialData.overall)}
                </p>
              )}

              {/* Hero amount */}
              <div
                className="relative pt-8 pb-10 cursor-text"
                onClick={() => amountRef.current?.focus()}
              >
                <div className="flex items-center justify-center">
                  <div className="relative flex items-center justify-center max-w-[90vw] overflow-hidden">
                    <span className="text-[2.75rem] md:text-6xl font-normal leading-none text-white select-none mr-3">
                      {currencySymbol}
                    </span>

                    <div className="flex items-center">
                      <span
                        className={clsx(
                          'text-[2.75rem] md:text-6xl font-normal leading-none tracking-tight transition-colors duration-200',
                          overall ? 'text-white' : 'text-white/40'
                        )}
                      >
                        {displayAmount || '0.00'}
                      </span>

                      {isAmountFocused && (
                        <motion.div
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                          className="w-[2.5px] h-11 md:h-12 bg-[#2D8CFF] ml-1"
                        />
                      )}
                    </div>

                    <input
                      ref={amountRef}
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="next"
                      value={isAmountFocused ? overall : ''}
                      onChange={handleAmountChange}
                      onFocus={() => setIsAmountFocused(true)}
                      onBlur={() => setIsAmountFocused(false)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Next button */}
              <div className="pt-2 pb-2">
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!overall || overallNum <= 0}
                  className="w-full bg-[#2D8CFF] hover:bg-[#247BE0] disabled:bg-[#2D8CFF]/50 disabled:cursor-not-allowed text-white text-[17px] font-semibold py-[14px] rounded-full transition-all duration-200 shadow-[0_4px_24px_-4px_rgba(45,140,255,0.4)]"
                >
                  Next
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
            >
              {/* Header row: back / title / skip */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="p-1 -ml-1 text-white/60 hover:text-white transition-colors"
                  aria-label="Back"
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>

                <h2 className="text-[17px] font-semibold tracking-tight text-white">
                  Category Budgets
                </h2>

                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={loading}
                  className="text-[14px] text-white/50 hover:text-white/80 transition-colors"
                >
                  Skip
                </button>
              </div>

              {/* Allocation summary bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className={clsx('font-medium', isOverAllocated ? 'text-red-400' : 'text-white/60')}>
                    Allocated {currencySymbol}{formatCompact(allocatedTotal)}
                  </span>
                  <span className="text-white/40">
                    / {currencySymbol}{formatCompact(overallNum)}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-300',
                      isOverAllocated ? 'bg-red-400' : 'bg-[#2D8CFF]'
                    )}
                    style={{
                      width: `${Math.min(100, overallNum > 0 ? (allocatedTotal / overallNum) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Category list */}
              <div className="max-h-[36vh] overflow-y-auto overscroll-contain -mx-1 px-1">
                {CATEGORIES.map((cat) => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    value={categories[cat.id] || 0}
                    onChange={updateCategory}
                  />
                ))}
              </div>

              {/* Save button */}
              <div className="pt-3 pb-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || !overall || overallNum <= 0}
                  className="w-full bg-[#2D8CFF] hover:bg-[#247BE0] disabled:bg-[#2D8CFF]/50 disabled:cursor-not-allowed text-white text-[17px] font-semibold py-[14px] rounded-full transition-all duration-200 shadow-[0_4px_24px_-4px_rgba(45,140,255,0.4)]"
                >
                  {loading ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
