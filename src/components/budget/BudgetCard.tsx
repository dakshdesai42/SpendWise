import BudgetProgressBar from '../charts/BudgetProgressBar';
import { CATEGORY_MAP } from '../../utils/constants';

export default function BudgetCard({ categoryId, spent, budget }: { categoryId: string; spent: number; budget: number }) {
  const cat = CATEGORY_MAP[categoryId as keyof typeof CATEGORY_MAP] || CATEGORY_MAP.other;

  return (
    <div className="flex flex-col gap-3 px-4 py-4 md:px-5 bg-transparent border-none">
      <div className="flex items-center gap-3">
        {/* Category icon with glow */}
        <div className="relative w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 bg-[#121214] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
          <span style={{ color: cat.color }} className="drop-shadow-[0_0_8px_currentColor]">{cat.icon}</span>
        </div>
        <span className="text-[15px] font-medium text-white tracking-tight">{cat.label}</span>
      </div>
      <BudgetProgressBar
        spent={spent}
        budget={budget}
        color={cat.color}
      />
    </div>
  );
}
