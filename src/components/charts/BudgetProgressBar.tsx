import { motion } from 'framer-motion';
import clsx from 'clsx';
import { barFillVariants } from '../../utils/animations';

export default function BudgetProgressBar({ spent, budget, label, color, showAmount = true }: { spent: number; budget: number; label?: string; color?: string; showAmount?: boolean }) {
  const percent = budget > 0 ? (spent / budget) * 100 : 0;
  const cappedPercent = Math.min(percent, 100);

  const barColor =
    percent >= 100
      ? '#FF453A' // Neon Red
      : percent >= 90
        ? '#FF9F0A' // Neon Orange
        : percent >= 75
          ? '#ffd60a' // Neon Yellow
          : color || '#2D8CFF'; // Neon Blue

  return (
    <div className="space-y-2">
      {(label || showAmount) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-text-secondary">{label}</span>
          )}
          {showAmount && (
            <span className="text-xs text-text-tertiary">
              ${spent.toFixed(0)} / ${budget.toFixed(0)}
            </span>
          )}
        </div>
      )}
      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden drop-shadow-md">
        <motion.div
          className={clsx(
            'h-full rounded-full',
            percent >= 100 && 'animate-pulse'
          )}
          style={{
            backgroundColor: barColor,
            boxShadow: `0 0 12px ${barColor}`
          }}
          variants={barFillVariants}
          initial="initial"
          animate="animate"
          custom={cappedPercent}
        />
      </div>
      {percent >= 90 && (
        <p className={clsx(
          'text-xs font-semibold tracking-wide',
          percent >= 100 ? 'text-[#FF453A]' : 'text-[#FF9F0A]'
        )}>
          {percent >= 100
            ? `OVER BUDGET $${(spent - budget).toFixed(0)}`
            : `${(100 - percent).toFixed(0)}% LEFT`}
        </p>
      )}
    </div>
  );
}
