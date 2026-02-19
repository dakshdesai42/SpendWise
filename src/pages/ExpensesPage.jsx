import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFAB } from '../context/FABContext';
import { format, addMonths, subMonths } from 'date-fns';
import { HiPlus, HiChevronLeft, HiChevronRight, HiArrowUpTray, HiTrash, HiPause, HiPlay } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  getExpensesByMonth,
  addExpense,
  updateExpense,
  deleteExpense,
} from '../services/expenses';
import {
  getRecurringExpenses,
  addRecurringExpense,
  deleteRecurringExpense,
  toggleRecurringExpense,
  autoPostRecurringForMonth,
} from '../services/recurring';
import { getCurrentMonth, formatMonth, formatCurrency } from '../utils/formatters';
import { CATEGORIES, CATEGORY_MAP } from '../utils/constants';
import { DEMO_EXPENSES, DEMO_RECURRING } from '../utils/demoData';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ExpenseForm from '../components/expense/ExpenseForm';
import ExpenseList from '../components/expense/ExpenseList';
import ImportModal from '../components/import/ImportModal';
import ConfirmSheet from '../components/ui/ConfirmSheet';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const { user, demoMode } = useAuth();
  const { hostCurrency } = useCurrency();
  const { setFABAction } = useFAB();
  const [tab, setTab] = useState('transactions');
  const [month, setMonth] = useState(getCurrentMonth());
  const [expenses, setExpenses] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'expense'|'recurring', item }


  // Register FAB → open add expense form
  useEffect(() => {
    setFABAction(() => { setEditingExpense(null); setShowForm(true); });
    return () => setFABAction(null);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (demoMode) {
      setExpenses(DEMO_EXPENSES);
      setRecurring(DEMO_RECURRING);
      setLoading(false);
      return;
    }
    loadAll();
  }, [user, month, demoMode]);

  async function loadAll() {
    setLoading(true);
    try {
      await autoPostRecurringForMonth(user.uid, month);
      const [expData, recData] = await Promise.all([
        getExpensesByMonth(user.uid, month),
        getRecurringExpenses(user.uid),
      ]);
      setExpenses(expData);
      setRecurring(recData);
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(data) {
    if (demoMode) { toast.success('Expense added! (Demo mode)'); return; }
    if (data.isRecurring) {
      await addRecurringExpense(user.uid, { ...data, startDate: data.date });
      toast.success('Recurring expense added!');
    } else {
      await addExpense(user.uid, data);
      toast.success('Expense added!');
    }
    loadAll();
  }

  async function handleEdit(data) {
    if (demoMode) { toast.success('Expense updated! (Demo mode)'); return; }
    if (!editingExpense) return;
    await updateExpense(user.uid, editingExpense.id, data);
    toast.success('Expense updated!');
    setEditingExpense(null);
    loadAll();
  }

  function handleDelete(expense) {
    if (demoMode) { toast.success('Expense deleted! (Demo mode)'); return; }
    setConfirmDelete({ type: 'expense', item: expense });
  }

  function handleDeleteRecurring(rec) {
    if (demoMode) { toast.success('Recurring expense removed! (Demo mode)'); return; }
    setConfirmDelete({ type: 'recurring', item: rec });
  }

  async function executeDelete() {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'expense') {
        await deleteExpense(user.uid, confirmDelete.item.id, confirmDelete.item.month);
        toast.success('Expense deleted');
      } else {
        await deleteRecurringExpense(user.uid, confirmDelete.item.id);
        toast.success('Recurring expense removed');
      }
      loadAll();
    } catch {
      toast.error('Failed to delete');
    }
  }

  async function handleToggleRecurring(rec) {
    if (demoMode) { toast.success('Updated! (Demo mode)'); return; }
    await toggleRecurringExpense(user.uid, rec.id, !rec.isActive);
    toast.success(rec.isActive ? 'Paused' : 'Resumed');
    loadAll();
  }

  function prevMonth() {
    const d = new Date(month + '-01');
    setMonth(format(subMonths(d, 1), 'yyyy-MM'));
  }

  function nextMonth() {
    const d = new Date(month + '-01');
    const next = format(addMonths(d, 1), 'yyyy-MM');
    if (next <= getCurrentMonth()) setMonth(next);
  }

  const filtered = filter === 'all'
    ? expenses
    : expenses.filter((e) => e.category === filter);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const categoriesWithCount = CATEGORIES
    .map((cat) => ({ ...cat, count: expenses.filter((e) => e.category === cat.id).length }))
    .filter((cat) => cat.count > 0)
    .sort((a, b) => b.count - a.count);
  const visibleFilters = showAllFilters ? categoriesWithCount : categoriesWithCount.slice(0, 4);
  const hasMoreFilters = categoriesWithCount.length > 4;
  const activeFilterLabel = filter === 'all'
    ? 'all categories'
    : CATEGORIES.find((cat) => cat.id === filter)?.label || filter;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 py-3 md:py-4 px-1 sm:px-0">
        <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-text-primary">Expenses</h2>
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

      {/* Tab switcher */}
      <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.07] p-1 mb-6 w-fit">
        {[
          { id: 'transactions', label: 'Transactions' },
          { id: 'recurring', label: `Recurring${recurring.length ? ` (${recurring.length})` : ''}` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-1.5 text-sm rounded-lg transition-colors',
              tab === t.id
                ? 'bg-accent-primary/15 text-accent-primary font-medium'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'transactions' ? (
          <motion.div key="transactions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Month Selector */}
            <div className="flex items-center justify-center gap-4 mb-6 md:mb-8">
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

            <div className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <p className="text-xs text-text-secondary">
                Showing {filtered.length} expenses • Total {formatCurrency(total, hostCurrency)} • {activeFilterLabel}
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6 px-1 sm:px-0">
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
              {visibleFilters.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilter(cat.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    filter === cat.id ? 'text-white' : 'bg-white/[0.04] text-text-tertiary hover:text-text-secondary'
                  )}
                  style={filter === cat.id ? { backgroundColor: `${cat.color}30`, color: cat.color } : {}}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
              {hasMoreFilters && (
                <button
                  onClick={() => setShowAllFilters((prev) => !prev)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-white/[0.04] text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showAllFilters ? 'Less' : `More (${categoriesWithCount.length - 4})`}
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : (
              <GlassCard className="p-4 md:p-5">
                <ExpenseList
                  expenses={filtered}
                  onEdit={(e) => { setEditingExpense(e); setShowForm(true); }}
                  onDelete={handleDelete}
                  emptyMessage={filter !== 'all' ? 'No expenses in this category' : undefined}
                />
              </GlassCard>
            )}
          </motion.div>
        ) : (
          <motion.div key="recurring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {loading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : recurring.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <p className="text-3xl mb-3">🔁</p>
                <p className="text-sm font-medium text-text-primary mb-1">No recurring expenses yet</p>
                <p className="text-xs text-text-tertiary mb-4">Add an expense and toggle "Recurring" to get started</p>
                <Button size="sm" onClick={() => setShowForm(true)} icon={<HiPlus className="w-4 h-4" />}>
                  Add Recurring
                </Button>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {recurring.map((rec) => {
                  const cat = CATEGORY_MAP[rec.category] || CATEGORY_MAP.other;
                  return (
                    <GlassCard key={rec.id} className="p-5 md:p-6">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          {cat.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {rec.note || cat.label}
                            </p>
                            <span className={clsx(
                              'shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border capitalize',
                              rec.isActive
                                ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/20'
                                : 'bg-white/[0.04] text-text-tertiary border-white/[0.08]'
                            )}>
                              🔁 {rec.frequency}
                            </span>
                            {!rec.isActive && (
                              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/20">
                                Paused
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">
                            <span style={{ color: cat.color }}>{cat.label}</span>
                            {rec.startDate && ` • Started ${format(new Date(rec.startDate), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-semibold text-text-primary">
                            {formatCurrency(rec.amount, hostCurrency)}
                          </p>
                          <p className="text-xs text-text-tertiary capitalize">{rec.frequency}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleToggleRecurring(rec)}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-primary hover:bg-white/[0.08] transition-colors"
                            title={rec.isActive ? 'Pause' : 'Resume'}
                          >
                            {rec.isActive ? <HiPause className="w-4 h-4" /> : <HiPlay className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteRecurring(rec)}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                          >
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
        onImported={loadAll}
      />

      <ConfirmSheet
        isOpen={!!confirmDelete}
        title={confirmDelete?.type === 'recurring' ? 'Remove Recurring Expense?' : 'Delete Expense?'}
        message="This can't be undone."
        confirmLabel={confirmDelete?.type === 'recurring' ? 'Remove' : 'Delete'}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
        danger
      />
    </div>
  );
}
