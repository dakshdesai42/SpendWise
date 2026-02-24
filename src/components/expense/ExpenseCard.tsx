import { motion } from 'framer-motion';
import { HiPencil, HiTrash } from 'react-icons/hi2';
import { CATEGORY_MAP } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { hapticMedium } from '../../utils/haptics';
import { useCurrency } from '../../context/CurrencyContext';
import { Expense } from '../../types/models';

export default function ExpenseCard({ expense, onEdit, onDelete }: { expense: Expense; onEdit?: (expense: Expense) => void; onDelete?: (expense: Expense) => void }) {
  const { hostCurrency } = useCurrency();
  const cat = CATEGORY_MAP[expense.category as keyof typeof CATEGORY_MAP] || CATEGORY_MAP.other;

  // Threshold for triggering actions
  const actionThreshold = 60;

  const handleDragEnd = (_event: any, info: any) => {
    const offset = info.offset.x;
    if (offset > actionThreshold && onEdit) {
      hapticMedium();
      onEdit(expense);
    } else if (offset < -actionThreshold && onDelete) {
      hapticMedium();
      onDelete(expense);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="relative rounded-2xl overflow-hidden group touch-pan-y"
    >
      {/* Background Action Container */}
      <div className="absolute inset-0 flex items-center justify-between px-6 bg-[#18181A]">
        {/* Left Action (Edit) */}
        <div className="flex items-center justify-start flex-1 h-full text-[#2D8CFF]">
          {onEdit && <HiPencil className="w-6 h-6 drop-shadow-[0_0_8px_rgba(45,140,255,0.6)]" />}
        </div>

        {/* Right Action (Delete) */}
        <div className="flex items-center justify-end flex-1 h-full text-[#FF453A]">
          {onDelete && <HiTrash className="w-6 h-6 drop-shadow-[0_0_8px_rgba(255,69,58,0.6)]" />}
        </div>
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        drag={onEdit || onDelete ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: onDelete ? 0.3 : 0, right: onEdit ? 0.3 : 0 }}
        onDragEnd={handleDragEnd}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
        whileTap={{ cursor: 'grabbing' }}
        className="relative z-10 flex items-center gap-4 px-4 py-4 md:px-5 bg-black cursor-grab shadow-[[-10px_0_20px_rgba(0,0,0,0.5),10px_0_20px_rgba(0,0,0,0.5)]] transition-colors"
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

        {/* Desktop Hover Actions Fallback (since drag is tricky on non-touch devices without visible cues) */}
        <div className="hidden lg:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 absolute right-4 bg-black/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/[0.08]">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
              className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] transition-all focus-visible:outline-none"
            >
              <HiPencil className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(expense); }}
              className="p-1.5 rounded-full text-white/40 hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-all focus-visible:outline-none"
            >
              <HiTrash className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
