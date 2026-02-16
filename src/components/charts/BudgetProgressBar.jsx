import { motion } from 'framer-motion';
import clsx from 'clsx';
import { barFillVariants } from '../../utils/animations';
import { formatCurrency } from '../../utils/formatters';
import { useCurrency } from '../../context/CurrencyContext';

export default function BudgetProgressBar({ spent, budget, label, color, showAmount = true }) {
  const { hostCurrency } = useCurrency();
  const percent = budget > 0 ? (spent / budget) * 100 : 0;
  const cappedPercent = Math.min(percent, 100);

  const barColor =
    percent >= 100
      ? 'var(--color-danger)'
      : percent >= 90
      ? 'var(--color-warning)'
      : percent >= 75
      ? '#f59e0b'
      : color || 'var(--color-accent-primary)';

  return (
    <div className="space-y-2.5">
      {(label || showAmount) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-text-secondary">{label}</span>
          )}
          {showAmount && (
            <span className="text-xs text-text-secondary">
              {formatCurrency(spent, hostCurrency)} / {formatCurrency(budget, hostCurrency)}
            </span>
          )}
        </div>
      )}
      <div className="h-2.5 rounded-full bg-white/[0.09] overflow-hidden">
        <motion.div
          className={clsx(
            'h-full rounded-full',
            percent >= 100 && 'animate-pulse'
          )}
          style={{ backgroundColor: barColor }}
          variants={barFillVariants}
          initial="initial"
          animate="animate"
          custom={cappedPercent}
        />
      </div>
      {percent >= 90 && (
        <p className={clsx(
          'text-xs font-semibold',
          percent >= 100 ? 'text-danger' : 'text-warning'
        )}>
          {percent >= 100
            ? `Over budget by ${formatCurrency(spent - budget, hostCurrency)}`
            : `${(100 - percent).toFixed(0)}% remaining`}
        </p>
      )}
    </div>
  );
}
