import { AnimatePresence } from 'framer-motion';
import ExpenseCard from './ExpenseCard';
import EmptyState from '../ui/EmptyState';
import { Expense } from '../../types/models';

export default function ExpenseList({ expenses, onEdit, onDelete, emptyMessage }: { expenses: Expense[]; onEdit?: (expense: Expense) => void; onDelete?: (expense: Expense) => void; emptyMessage?: string }) {
  if (!expenses || expenses.length === 0) {
    return (
      <EmptyState
        icon="💸"
        title={emptyMessage || 'No expenses yet'}
        description="Start tracking by adding your first expense"
      />
    );
  }

  return (
    <div className="flex flex-col gap-1 md:gap-2">
      <AnimatePresence mode="popLayout">
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
