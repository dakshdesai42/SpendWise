import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiPencil } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { getBudget, setBudget } from '../services/budgets';
import { getMonthlySummary } from '../services/expenses';
import { getCurrentMonth, formatMonth, formatCurrency } from '../utils/formatters';
import { containerVariants, itemVariants } from '../utils/animations';
import { CATEGORIES } from '../utils/constants';
import { DEMO_BUDGET, DEMO_SUMMARY } from '../utils/demoData';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import BudgetForm from '../components/budget/BudgetForm';
import BudgetCard from '../components/budget/BudgetCard';
import BudgetProgressBar from '../components/charts/BudgetProgressBar';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function BudgetsPage() {
  const { user, demoMode } = useAuth();
  const { hostCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [budget, setBudgetState] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const currentMonth = getCurrentMonth();

  useEffect(() => {
    if (!user) return;
    if (demoMode) {
      setBudgetState(DEMO_BUDGET);
      setSummary(DEMO_SUMMARY);
      setLoading(false);
      return;
    }
    loadData();
  }, [user, demoMode]);

  async function loadData() {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([
        getBudget(user!.uid, currentMonth),
        getMonthlySummary(user!.uid, currentMonth),
      ]);
      setBudgetState(b);
      setSummary(s);
    } catch (err) {
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data: any) {
    if (demoMode) { toast.success('Budget saved! (Demo mode)'); return; }
    try {
      await setBudget(user!.uid, currentMonth, data.overall, data.categories, data.currency);
      toast.success('Budget saved!');
      loadData();
    } catch (err) {
      toast.error('Failed to save budget');
    }
  }

  const totalSpent = summary?.totalSpent || 0;
  const categoryTotals = summary?.categoryTotals || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="app-page-header flex items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-text-primary">Budgets</h2>
          <p className="text-sm text-text-secondary mt-1">{formatMonth(currentMonth)}</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          variant={budget ? 'secondary' : 'primary'}
          icon={budget ? <HiPencil className="w-4 h-4" /> : undefined}
        >
          {budget ? 'Edit Budget' : 'Set Budget'}
        </Button>
      </div>

      {!budget ? (
        <EmptyState
          icon="📊"
          title="No budget set"
          description="Set a monthly budget to track your spending and stay on target"
          actionLabel="Set Budget"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="space-y-6 mt-3 md:mt-4"
        >
          {/* Overall Budget */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6 md:p-7">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-text-secondary">Overall Monthly Budget</h3>
                <span className="text-sm text-text-tertiary">
                  {formatCurrency(totalSpent, hostCurrency)} / {formatCurrency(budget.overall, hostCurrency)}
                </span>
              </div>
              <BudgetProgressBar
                spent={totalSpent}
                budget={budget.overall}
                showAmount={false}
              />
            </GlassCard>
          </motion.div>

          {/* Category Budgets */}
          {budget.categories && Object.keys(budget.categories).some((k) => budget.categories[k] > 0) && (
            <motion.div variants={itemVariants}>
              <h3 className="text-sm font-medium text-text-secondary mb-4 px-1 sm:px-0">Category Budgets</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CATEGORIES.filter((cat) => budget.categories[cat.id] > 0).map((cat) => (
                  <BudgetCard
                    key={cat.id}
                    categoryId={cat.id}
                    spent={categoryTotals[cat.id] || 0}
                    budget={budget.categories[cat.id]}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Unbudgeted categories with spending */}
          {Object.keys(categoryTotals).some((k) => !budget.categories?.[k] && categoryTotals[k] > 0) && (
            <motion.div variants={itemVariants}>
              <GlassCard className="p-6 md:p-7">
                <h3 className="text-sm font-medium text-text-secondary mb-3">Unbudgeted Spending</h3>
                <div className="space-y-2">
                  {CATEGORIES.filter((cat) => !budget.categories?.[cat.id] && categoryTotals[cat.id] > 0).map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">
                        {cat.icon} {cat.label}
                      </span>
                      <span className="text-sm font-medium text-text-primary">
                        {formatCurrency(categoryTotals[cat.id], hostCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </motion.div>
      )}

      <BudgetForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSave}
        initialData={budget}
      />
    </div>
  );
}
