import { motion } from 'framer-motion';
import { CATEGORY_MAP } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { useCurrency } from '../../context/CurrencyContext';

export default function CategoryBar({ categoryId, amount, maxAmount }: { categoryId: string; amount: number; maxAmount: number }) {
  const { hostCurrency } = useCurrency();
  const cat = CATEGORY_MAP[categoryId as keyof typeof CATEGORY_MAP] || CATEGORY_MAP.other;
  const percent = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg shrink-0">{cat.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-text-secondary">{cat.label}</span>
          <span className="text-xs font-medium text-text-primary">
            {formatCurrency(amount, hostCurrency)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: cat.color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percent, 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
