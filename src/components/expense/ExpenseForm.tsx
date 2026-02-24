import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import Modal from '../ui/Modal';
import { CATEGORIES, CURRENCY_MAP } from '../../utils/constants';
import { useCurrency } from '../../context/CurrencyContext';
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
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        {/* Top bar */}
        <div className="flex items-center justify-center relative pb-2">
          <h2 className="text-[17px] font-semibold tracking-tight text-white">
            {isEditing ? 'Edit Expense' : 'New Expense'}
          </h2>
        </div>

        {/* Hero amount */}
        <div
          className="relative pt-6 pb-8 cursor-text group"
          onClick={() => amountRef.current?.focus()}
        >
          <div className="relative text-center">

            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center max-w-[90vw] overflow-hidden">
                <span className="text-[2.75rem] md:text-6xl font-normal leading-none text-white select-none mr-3">
                  {currencySymbol}
                </span>

                {/* Visual Display */}
                <div className="flex items-center">
                  <span
                    className={clsx(
                      "text-[2.75rem] md:text-6xl font-normal leading-none tracking-tight transition-colors duration-200",
                      amount ? "text-white" : "text-white/40"
                    )}
                  >
                    {displayAmount || '0.00'}
                  </span>

                  {/* Blinking Blue Cursor */}
                  {isAmountFocused && (
                    <motion.div
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                      className="w-[2.5px] h-11 md:h-12 bg-[#2D8CFF] ml-1"
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
          </div>
        </div>

        {/* Category — horizontal scroll pills */}
        <div className="space-y-4 pb-2">
          <div className="flex flex-wrap gap-2.5">
            {sortedCats.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setCategory(cat.id); hapticLight(); }}
                className={clsx(
                  'flex items-center gap-2 px-3.5 py-2 rounded-full border transition-colors shrink-0',
                  category === cat.id
                    ? 'border-[#2D8CFF] bg-[#2D8CFF]/15'
                    : 'border-white/[0.08] bg-[#18181A] hover:bg-[#202020] text-white/70'
                )}
              >
                <span className="text-[15px]">{cat.icon}</span>
                <span
                  className={clsx(
                    'text-[13px] font-medium',
                    category === cat.id ? 'text-[#2D8CFF]' : 'text-white'
                  )}
                >
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <label className="block text-[15px] font-medium text-white">Note</label>
          <input
            type="text"
            placeholder="What was this for? (Optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-[#18181A] text-[15px] text-white border border-white/[0.06] rounded-xl px-4 py-3.5 placeholder:text-white/40 focus:outline-none focus:border-white/[0.12] transition-colors"
          />
        </div>

        {/* Action Row: Date & Recurring */}
        <div className="flex gap-3">
          {/* Date Picker Button Capsule */}
          <div className="relative w-[55%]">
            <div className="w-full bg-[#18181A] border border-white/[0.06] rounded-[14px] px-4 py-3 flex items-center justify-between pointer-events-none">
              <span className="text-[15px] text-white whitespace-nowrap">
                <span className="text-white/50 mr-1">Date:</span>
                {format(parseLocalDate(date), 'dd MMM yyyy')}
              </span>
              <svg className="w-[18px] h-[18px] text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            {/* Real hidden date input stacked correctly */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Recurring Toggle Capsule */}
          {!isEditing && (
            <button
              type="button"
              onClick={() => { setIsRecurring((v) => !v); hapticLight(); }}
              className="flex-1 bg-[#18181A] border border-white/[0.06] rounded-[14px] px-4 py-3 flex items-center justify-between active:bg-[#202022] transition-colors"
            >
              <span className="text-[14px] text-white/50 whitespace-nowrap mr-2">Recurring expense</span>
              {/* iOS-style toggle */}
              <div
                className={clsx(
                  "w-[34px] h-[20px] rounded-full transition-colors duration-200 shrink-0 flex items-center px-[2px]",
                  isRecurring ? 'bg-white' : 'bg-white/[0.15]'
                )}
              >
                <div
                  className={clsx(
                    "w-4 h-4 rounded-full transition-transform duration-200 shadow-sm",
                    isRecurring ? 'bg-black translate-x-[14px]' : 'bg-white translate-x-0'
                  )}
                />
              </div>
            </button>
          )}
        </div>

        {/* Submit */}
        <div className="pt-4 pb-2">
          <button
            type="submit"
            disabled={!amount || !category || numericAmount <= 0 || loading}
            className="w-full bg-[#2D8CFF] hover:bg-[#247BE0] disabled:bg-[#2D8CFF]/50 disabled:cursor-not-allowed text-white text-[17px] font-semibold py-[14px] rounded-full transition-all duration-200 shadow-[0_4px_24px_-4px_rgba(45,140,255,0.4)]"
          >
            {isEditing ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
