import BudgetProgressBar from '../charts/BudgetProgressBar';
import { CATEGORIES } from '../../utils/constants';

export default function BudgetOverview({ budget, categoryTotals }) {
  if (!budget) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-text-tertiary">No budget set for this month</p>
      </div>
    );
  }

  const totalSpent = Object.values(categoryTotals || {}).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-5">
      <BudgetProgressBar
        spent={totalSpent}
        budget={budget.overall}
        label="Overall Budget"
      />

      {budget.categories && Object.keys(budget.categories).length > 0 && (
        <div className="space-y-4 pt-2">
          {CATEGORIES.filter((cat) => budget.categories[cat.id] > 0).map((cat) => (
            <BudgetProgressBar
              key={cat.id}
              spent={categoryTotals?.[cat.id] || 0}
              budget={budget.categories[cat.id]}
              label={cat.label}
              color={cat.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
