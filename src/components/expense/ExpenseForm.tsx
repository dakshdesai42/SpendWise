import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { HiXMark } from 'react-icons/hi2';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { CATEGORIES, FREQUENCIES, CURRENCY_MAP } from '../../utils/constants';
import { useCurrency } from '../../context/CurrencyContext';
import { formatCurrency } from '../../utils/formatters';
import { Expense } from '../../types/models';
import clsx from 'clsx';
import { parseLocalDate } from '../../utils/date';
import { hapticLight, hapticSuccess } from '../../utils/haptics';

const RECENT_KEY = 'sw_recent_categories';

function getRecentCategories() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function recordCategoryUsed(id: string) {
  try {
    const recent = getRecentCategories().filter((c: string) => c !== id);
    recent.unshift(id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 8)));
  } catch { }
}

function getSortedCategories() {
  const recent = getRecentCategories();
  return [...CATEGORIES].sort((a, b) => {
    const ai = recent.indexOf(a.id);
    const bi = recent.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export default function ExpenseForm({ isOpen, onClose, onSubmit, initialData }: { isOpen: boolean; onClose: () => void; onSubmit: (data: Omit<Expense, 'id'>) => Promise<void>; initialData?: Expense | null }) {
  const { hostCurrency, homeCurrency, convertToHome, getRate } = useCurrency();
  const isEditing = !!initialData;

  const currencySymbol = CURRENCY_MAP[hostCurrency]?.symbol || hostCurrency;

  // Persistent form state — survives accidental closes
  const [amount, setAmount] = useState('');
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [sortedCats, setSortedCats] = useState(getSortedCategories);

  const amountRef = useRef<HTMLInputElement>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/,/g, '.'); // allow comma for european locales
    val = val.replace(/[^\d.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1]?.length > 2) {
      val = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }
    if (val !== amount) {
      setAmount(val);
      if (val) hapticLight();
    }
  };

  const displayAmount = useMemo(() => {
    if (!amount) return '';
    const parts = amount.split('.');
    const intPart = parts[0] || '0';
    const num = parseInt(intPart, 10);
    const formattedInt = isNaN(num) ? '0' : new Intl.NumberFormat('en-US').format(num);
    const decPart = parts.length > 1 ? `.${parts[1].slice(0, 2)}` : '';
    return formattedInt + decPart;
  }, [amount]);

  // When editing, seed from initialData; when adding (fresh open), keep previous state
  const prevIsOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      if (initialData) {
        // Editing: always seed from data
        setAmount(initialData.amount?.toString() || '');
        setCategory(initialData.category || '');
        setNote(initialData.note || '');
        setDate(initialData.date ? format(parseLocalDate(initialData.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        setIsRecurring(initialData.isRecurring || false);
        setFrequency(initialData.frequency || 'monthly');
      } else {
        // New expense: clear any stale edit data and refresh category sort
        setAmount('');
        setCategory('');
        setNote('');
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setIsRecurring(false);
        setFrequency('monthly');
        setSortedCats(getSortedCategories());
      }
      // Autofocus amount
      setTimeout(() => amountRef.current?.focus(), 80);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialData]);

  const numericAmount = parseFloat(amount) || 0;
  const homeAmount = convertToHome(numericAmount);
  const rate = getRate(hostCurrency, homeCurrency);

  function handleClose() {
    onClose();
    // Only fully reset for new expense forms; editing reseeds each open
    if (!initialData) {
      setAmount('');
      setCategory('');
      setNote('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setIsRecurring(false);
      setFrequency('monthly');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !category || numericAmount <= 0) return;

    setLoading(true);
    try {
      recordCategoryUsed(category);
      hapticSuccess();
      await onSubmit({
        amount: numericAmount,
        amountHome: homeAmount,
        exchangeRate: rate,
        category,
        note,
        date,
        isRecurring,
        frequency: isRecurring ? frequency : null,
      });
      // Reset after successful submit
      setAmount('');
      setCategory('');
      setNote('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setIsRecurring(false);
      setFrequency('monthly');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">
            {isEditing ? 'Edit Expense' : 'New Expense'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="h-9 w-9 rounded-full border border-white/[0.08] bg-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/[0.1] transition-colors flex items-center justify-center"
            aria-label="Close add expense form"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Hero amount */}
        <div
          className="relative rounded-[24px] md:rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.01] px-5 py-8 md:py-10 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.02)] overflow-hidden cursor-text group transition-colors"
          onClick={() => amountRef.current?.focus()}
        >
          {/* Subtle glow accent behind the amount */}
          <div className="absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-60 group-focus-within:opacity-100">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent-primary/[0.07] rounded-full blur-3xl" />
          </div>

          <div className="relative text-center space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Amount</p>

            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center max-w-[90vw] overflow-hidden">
                <span className="text-4xl md:text-5xl font-light leading-none text-text-secondary select-none mr-1.5 opacity-80 mt-1">
                  {currencySymbol}
                </span>

                {/* Visual Display */}
                <div className="flex items-center">
                  <span
                    className={clsx(
                      "text-6xl md:text-[5rem] font-thin leading-none tracking-tight transition-colors duration-200",
                      amount ? "text-text-primary" : "text-text-tertiary/40"
                    )}
                  >
                    {displayAmount || '0.00'}
                  </span>

                  {/* Blinking Cursor */}
                  {isAmountFocused && (
                    <motion.div
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                      className="w-1 h-14 md:h-16 bg-accent-primary ml-1.5 rounded-full"
                    />
                  )}
                </div>

                {/* Hidden Input Layer */}
                <input
                  ref={amountRef}
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={handleAmountChange}
                  onFocus={() => setIsAmountFocused(true)}
                  onBlur={() => setIsAmountFocused(false)}
                  aria-label="Amount"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                />
              </div>
            </div>

            <AnimatePresence>
              {numericAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="flex justify-center mt-3"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-full border border-white/[0.08] bg-black/20 text-text-secondary shadow-sm backdrop-blur-md">
                    ≈ {formatCurrency(homeAmount, homeCurrency)}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Category — recency sorted */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-secondary">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {sortedCats.map((cat) => (
              <motion.button
                key={cat.id}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => { setCategory(cat.id); hapticLight(); }}
                className={clsx(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150',
                  category === cat.id
                    ? 'border-accent-primary/50 bg-accent-primary/15'
                    : 'border-white/[0.06] bg-white/[0.02] active:bg-white/[0.08]'
                )}
              >
                <span className="text-xl">{cat.icon}</span>
                <span
                  className={clsx(
                    'text-[10px] font-medium leading-tight text-center',
                    category === cat.id ? 'text-accent-primary' : 'text-text-secondary'
                  )}
                >
                  {cat.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Note */}
        <Input
          label="Note (optional)"
          placeholder="What was this for?"
          value={note}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
        />

        {/* Date */}
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
        />

        {/* Recurring toggle — new expenses only */}
        {!isEditing && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => { setIsRecurring((v) => !v); hapticLight(); }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] active:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🔁</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-text-primary">Recurring expense</p>
                  <p className="text-xs text-text-tertiary">Repeats automatically</p>
                </div>
              </div>
              {/* iOS-style toggle */}
              <div
                className={`w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${isRecurring ? 'bg-accent-primary' : 'bg-white/[0.12]'
                  }`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-5 h-5 rounded-full bg-white mt-0.5 shadow"
                  style={{ marginLeft: isRecurring ? '22px' : '2px' }}
                />
              </div>
            </button>

            <AnimatePresence>
              {isRecurring && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-4 gap-2 overflow-hidden"
                >
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFrequency(f.id)}
                      className={clsx(
                        'py-2 px-1 rounded-xl border text-xs font-medium transition-colors',
                        frequency === f.id
                          ? 'border-accent-primary/50 bg-accent-primary/15 text-accent-primary'
                          : 'border-white/[0.06] bg-white/[0.02] text-text-secondary'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={loading}
          disabled={!amount || !category || numericAmount <= 0}
        >
          {isEditing ? 'Save Changes' : 'Add Expense'}
        </Button>
      </form>
    </Modal>
  );
}
