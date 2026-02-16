import GlassCard from '../ui/GlassCard';
import BudgetProgressBar from '../charts/BudgetProgressBar';
import { CATEGORY_MAP } from '../../utils/constants';

export default function BudgetCard({ categoryId, spent, budget }) {
  const cat = CATEGORY_MAP[categoryId] || CATEGORY_MAP.other;
  const initial = cat.label.slice(0, 1).toUpperCase();

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
        >
          {initial}
        </span>
        <span className="text-sm font-medium text-text-primary">{cat.label}</span>
      </div>
      <BudgetProgressBar
        spent={spent}
        budget={budget}
        color={cat.color}
      />
    </GlassCard>
  );
}
