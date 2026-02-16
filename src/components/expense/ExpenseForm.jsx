import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { CATEGORIES } from '../../utils/constants';
import { useCurrency } from '../../context/CurrencyContext';
import { formatCurrency } from '../../utils/formatters';
import clsx from 'clsx';

export default function ExpenseForm({ isOpen, onClose, onSubmit, initialData }) {
  const { hostCurrency, homeCurrency, convertToHome, getRate } = useCurrency();
  const isEditing = !!initialData;

  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [date, setDate] = useState(
    initialData?.date
      ? format(new Date(initialData.date), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [loading, setLoading] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const homeAmount = convertToHome(numericAmount);
  const rate = getRate(hostCurrency, homeCurrency);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || !category) return;

    setLoading(true);
    try {
      await onSubmit({
        amount: numericAmount,
        amountHome: homeAmount,
        exchangeRate: rate,
        category,
        note,
        date,
      });
      onClose();
      setAmount('');
      setCategory('');
      setNote('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Expense' : 'Add Expense'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-secondary">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-text-tertiary">
              {hostCurrency}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-16 pr-4 py-4 text-2xl font-bold text-text-primary placeholder-text-tertiary focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20 transition-all"
            />
          </div>
          {numericAmount > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-text-tertiary pl-1"
            >
              ~{formatCurrency(homeAmount, homeCurrency)}
            </motion.p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-secondary">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat.id}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCategory(cat.id)}
                className={clsx(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200',
                  category === cat.id
                    ? 'border-accent-primary/50 bg-accent-primary/15'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06]'
                )}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-[10px] font-medium text-text-secondary">{cat.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Note */}
        <Input
          label="Note (optional)"
          placeholder="What was this for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Date */}
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={loading}
          disabled={!amount || !category}
        >
          {isEditing ? 'Save Changes' : 'Add Expense'}
        </Button>
      </form>
    </Modal>
  );
}
