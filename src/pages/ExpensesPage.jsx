import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, addMonths, subMonths } from 'date-fns';
import { HiPlus, HiChevronLeft, HiChevronRight, HiArrowUpTray } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import {
  getExpensesByMonth,
  addExpense,
  updateExpense,
  deleteExpense,
} from '../services/expenses';
import { getCurrentMonth, formatMonth } from '../utils/formatters';
import { CATEGORIES } from '../utils/constants';
import { DEMO_EXPENSES } from '../utils/demoData';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ExpenseForm from '../components/expense/ExpenseForm';
import ExpenseList from '../components/expense/ExpenseList';
import ImportModal from '../components/import/ImportModal';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const { user, demoMode } = useAuth();
  const [month, setMonth] = useState(getCurrentMonth());
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    if (demoMode) {
      setExpenses(DEMO_EXPENSES);
      setLoading(false);
      return;
    }
    loadExpenses();
  }, [user, month, demoMode]);

  async function loadExpenses() {
    setLoading(true);
    try {
      const data = await getExpensesByMonth(user.uid, month);
      setExpenses(data);
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(data) {
    if (demoMode) { toast.success('Expense added! (Demo mode)'); return; }
    await addExpense(user.uid, data);
    toast.success('Expense added!');
    loadExpenses();
  }

  async function handleEdit(data) {
    if (demoMode) { toast.success('Expense updated! (Demo mode)'); return; }
    if (!editingExpense) return;
    await updateExpense(user.uid, editingExpense.id, data);
    toast.success('Expense updated!');
    setEditingExpense(null);
    loadExpenses();
  }

  async function handleDelete(expense) {
    if (demoMode) { toast.success('Expense deleted! (Demo mode)'); return; }
    if (!confirm('Delete this expense?')) return;
    await deleteExpense(user.uid, expense.id, expense.month);
    toast.success('Expense deleted');
    loadExpenses();
  }

  function prevMonth() {
    const d = new Date(month + '-01');
    setMonth(format(subMonths(d, 1), 'yyyy-MM'));
  }

  function nextMonth() {
    const d = new Date(month + '-01');
    const next = format(addMonths(d, 1), 'yyyy-MM');
    if (next <= getCurrentMonth()) {
      setMonth(next);
    }
  }

  const filtered = filter === 'all'
    ? expenses
    : expenses.filter((e) => e.category === filter);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-4 lg:px-0">
        <h2 className="text-xl lg:text-2xl font-bold text-text-primary">Expenses</h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowImport(true)}
            icon={<HiArrowUpTray className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            onClick={() => { setEditingExpense(null); setShowForm(true); }}
            icon={<HiPlus className="w-4 h-4" />}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/[0.06] text-text-secondary transition-colors">
          <HiChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-semibold text-text-primary min-w-[160px] text-center">
          {formatMonth(month)}
        </span>
        <button
          onClick={nextMonth}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            month >= getCurrentMonth()
              ? 'text-text-tertiary cursor-not-allowed'
              : 'hover:bg-white/[0.06] text-text-secondary'
          )}
          disabled={month >= getCurrentMonth()}
        >
          <HiChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none px-4 lg:px-0">
        <button
          onClick={() => setFilter('all')}
          className={clsx(
            'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
            filter === 'all'
              ? 'bg-accent-primary/15 text-accent-primary'
              : 'bg-white/[0.04] text-text-tertiary hover:text-text-secondary'
          )}
        >
          All ({expenses.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = expenses.filter((e) => e.category === cat.id).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                filter === cat.id
                  ? 'text-white'
                  : 'bg-white/[0.04] text-text-tertiary hover:text-text-secondary'
              )}
              style={filter === cat.id ? { backgroundColor: `${cat.color}30`, color: cat.color } : {}}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Expense List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : (
        <GlassCard>
          <ExpenseList
            expenses={filtered}
            onEdit={(e) => { setEditingExpense(e); setShowForm(true); }}
            onDelete={handleDelete}
            emptyMessage={filter !== 'all' ? 'No expenses in this category' : undefined}
          />
        </GlassCard>
      )}

      {/* Forms */}
      <ExpenseForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingExpense(null); }}
        onSubmit={editingExpense ? handleEdit : handleAdd}
        initialData={editingExpense}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={loadExpenses}
      />
    </div>
  );
}
