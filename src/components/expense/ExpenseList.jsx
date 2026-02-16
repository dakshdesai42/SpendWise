import { AnimatePresence } from 'framer-motion';
import ExpenseCard from './ExpenseCard';
import EmptyState from '../ui/EmptyState';

export default function ExpenseList({ expenses, onEdit, onDelete, emptyMessage }) {
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
    <div className="space-y-1">
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
