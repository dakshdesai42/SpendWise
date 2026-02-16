import GlassCard from '../ui/GlassCard';
import BudgetProgressBar from '../charts/BudgetProgressBar';
import { CATEGORY_MAP } from '../../utils/constants';

export default function BudgetCard({ categoryId, spent, budget }) {
  const cat = CATEGORY_MAP[categoryId] || CATEGORY_MAP.other;

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{cat.icon}</span>
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
