import { motion } from 'framer-motion';
import { HiPencil, HiTrash } from 'react-icons/hi2';
import { CATEGORY_MAP } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useCurrency } from '../../context/CurrencyContext';

export default function ExpenseCard({ expense, onEdit, onDelete }) {
  const { hostCurrency, homeCurrency } = useCurrency();
  const cat = CATEGORY_MAP[expense.category] || CATEGORY_MAP.other;
  const iconLabel = cat.label.slice(0, 1).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      className="flex items-center gap-3.5 p-3.5 md:p-4 rounded-xl border border-white/[0.08] transition-colors group"
    >
      {/* Category icon */}
      <div
        className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: `${cat.color}20` }}
      >
        <span className="text-sm font-semibold" style={{ color: cat.color }}>
          {iconLabel}
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate leading-snug">
            {expense.note || cat.label}
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 tracking-wide"
            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
          >
            {cat.label}
          </span>
        </div>
        <p className="text-xs text-text-secondary mt-0.5">
          {formatDate(expense.date)}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-text-primary">
          {formatCurrency(expense.amount, hostCurrency)}
        </p>
        {hostCurrency !== homeCurrency && (
          <p className="text-xs text-text-tertiary">
            ~{formatCurrency(expense.amountHome || 0, homeCurrency)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
        {onEdit && (
          <button
            onClick={() => onEdit(expense)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-primary hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/35"
          >
            <HiPencil className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(expense)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/35"
          >
            <HiTrash className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
