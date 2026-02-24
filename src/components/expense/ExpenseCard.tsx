import { motion } from 'framer-motion';
import { HiPencil, HiTrash } from 'react-icons/hi2';
import { CATEGORY_MAP } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useCurrency } from '../../context/CurrencyContext';
import { Expense } from '../../types/models';

export default function ExpenseCard({ expense, onEdit, onDelete }: { expense: Expense; onEdit?: (expense: Expense) => void; onDelete?: (expense: Expense) => void }) {
  const { hostCurrency } = useCurrency();
  const cat = CATEGORY_MAP[expense.category as keyof typeof CATEGORY_MAP] || CATEGORY_MAP.other;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      className="flex items-center gap-4 px-4 py-4 md:px-5 transition-colors group cursor-pointer rounded-2xl"
    >
      {/* Category icon */}
      <div
        className="relative w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 bg-[#121214] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
      >
        <span style={{ color: cat.color }} className="drop-shadow-[0_0_8px_currentColor]">{cat.icon}</span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[15px] font-medium text-white truncate leading-snug">
            {expense.note || cat.label}
          </p>
          {expense.isRecurring && (
            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-[#2D8CFF]/15 text-[#2D8CFF] border border-[#2D8CFF]/20 capitalize">
              🔁 {expense.frequency}
            </span>
          )}
        </div>
        <p className="text-[13px] text-white/50 mt-1 font-medium">
          {formatDate(expense.date)} <span className="text-white/20 px-1">•</span> <span style={{ color: cat.color }}>{cat.label}</span>
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="text-[17px] font-semibold text-white tracking-tight">
          {formatCurrency(expense.amount, hostCurrency)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
        {onEdit && (
          <button
            onClick={() => onEdit(expense)}
            className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D8CFF]/50"
          >
            <HiPencil className="w-5 h-5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(expense)}
            className="p-2 rounded-full text-white/40 hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF453A]/50"
          >
            <HiTrash className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
