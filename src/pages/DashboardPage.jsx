import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, subMonths } from 'date-fns';
import { HiArrowTrendingDown, HiArrowTrendingUp, HiBanknotes, HiHome as HiHomeIcon, HiFire } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { getRecentExpenses, getMonthlySummary, getMultipleMonthSummaries, addExpense } from '../services/expenses';
import { getBudget } from '../services/budgets';
import { getCurrentMonth, formatCurrency } from '../utils/formatters';
import { containerVariants, itemVariants } from '../utils/animations';
import { DEMO_EXPENSES, DEMO_SUMMARY, DEMO_BUDGET, DEMO_TREND } from '../utils/demoData';
import Header from '../components/layout/Header';
import GlassCard from '../components/ui/GlassCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ExpenseForm from '../components/expense/ExpenseForm';
import ExpenseList from '../components/expense/ExpenseList';
import SpendingDonut from '../components/charts/SpendingDonut';
import MonthlyTrend from '../components/charts/MonthlyTrend';
import BudgetOverview from '../components/budget/BudgetOverview';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user, profile, demoMode } = useAuth();
  const { hostCurrency, homeCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [budget, setBudget] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const currentMonth = getCurrentMonth();

  useEffect(() => {
    if (!user) return;
    if (demoMode) {
      loadDemoData();
    } else {
      loadDashboard();
    }
  }, [user, demoMode]);

  function loadDemoData() {
    setRecentExpenses(DEMO_EXPENSES.slice(0, 5));
    setSummary(DEMO_SUMMARY);
    setBudget(DEMO_BUDGET);
    setTrendData(DEMO_TREND);
    setLoading(false);
  }

  async function loadDashboard() {
    setLoading(true);
    try {
      const [recent, monthSummary, monthBudget] = await Promise.all([
        getRecentExpenses(user.uid, 5),
        getMonthlySummary(user.uid, currentMonth),
        getBudget(user.uid, currentMonth),
      ]);

      setRecentExpenses(recent);
      setSummary(monthSummary);
      setBudget(monthBudget);

      const months = [];
      for (let i = 5; i >= 0; i--) {
        months.push(format(subMonths(new Date(), i), 'yyyy-MM'));
      }
      const summaries = await getMultipleMonthSummaries(user.uid, months);
      const trend = months.map((m) => ({
        month: format(new Date(m + '-01'), 'MMM'),
        total: summaries[m]?.totalSpent || 0,
      }));
      setTrendData(trend);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(data) {
    if (demoMode) {
      toast.success('Expense added! (Demo mode)');
      return;
    }
    try {
      await addExpense(user.uid, data);
      toast.success('Expense added!');
      loadDashboard();
    } catch (err) {
      toast.error('Failed to add expense');
    }
  }

  const totalSpent = summary?.totalSpent || 0;
  const totalSpentHome = summary?.totalSpentHome || 0;
  const budgetRemaining = budget ? budget.overall - totalSpent : null;
  const budgetPercent = budget ? (totalSpent / budget.overall) * 100 : 0;
  const streak = profile?.currentStreak || 0;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const loggedToday = recentExpenses.some(
    (e) => format(new Date(e.date), 'yyyy-MM-dd') === todayStr
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <Header onAddExpense={() => setShowExpenseForm(true)} />

      {demoMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-accent-secondary/8 border border-accent-secondary/20 p-3 mb-4 text-center"
        >
          <p className="text-xs text-accent-secondary font-medium tracking-wide">
            Demo mode - add Firebase credentials in .env to connect real data
          </p>
        </motion.div>
      )}

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        {/* Streak */}
        {streak > 0 && (
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-orange-400/25 bg-orange-400/10">
            <HiFire className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-semibold text-orange-300">{streak}-day streak</span>
          </motion.div>
        )}

        {!loggedToday && !demoMode && recentExpenses.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="rounded-xl bg-accent-primary/10 border border-accent-primary/25 p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary">No expenses logged today</p>
              <p className="text-xs text-text-secondary mt-0.5">Track a no-spend day or add a transaction.</p>
            </div>
            <button
              onClick={() => setShowExpenseForm(true)}
              className="text-xs font-semibold text-accent-primary hover:underline shrink-0"
            >
              Add now
            </button>
          </motion.div>
        )}

        {/* Stat Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-3.5">
              <div className="p-2.5 rounded-xl bg-accent-primary/15 border border-accent-primary/20">
                <HiBanknotes className="w-5 h-5 text-accent-primary" />
              </div>
              <span className="text-sm font-medium text-text-secondary">Spent this month</span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-text-primary">
              {formatCurrency(totalSpent, hostCurrency)}
            </p>
            <p className="text-sm text-text-secondary mt-1.5">
              ~{formatCurrency(totalSpentHome, homeCurrency)}
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-3.5">
              <div className="p-2.5 rounded-xl bg-accent-secondary/15 border border-accent-secondary/20">
                <HiHomeIcon className="w-5 h-5 text-accent-secondary" />
              </div>
              <span className="text-sm font-medium text-text-secondary">Home currency total</span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-text-primary">
              {formatCurrency(totalSpentHome, homeCurrency)}
            </p>
            <p className="text-sm text-text-secondary mt-1.5">
              {summary?.transactionCount || 0} transactions
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-3.5">
              <div className={`p-2.5 rounded-xl border ${budgetPercent > 90 ? 'bg-danger/15 border-danger/25' : budgetPercent > 75 ? 'bg-warning/15 border-warning/25' : 'bg-success/15 border-success/20'}`}>
                {budgetPercent > 90 ? (
                  <HiArrowTrendingUp className="w-5 h-5 text-danger" />
                ) : (
                  <HiArrowTrendingDown className="w-5 h-5 text-success" />
                )}
              </div>
              <span className="text-sm font-medium text-text-secondary">Budget remaining</span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-text-primary">
              {budgetRemaining !== null
                ? formatCurrency(Math.max(budgetRemaining, 0), hostCurrency)
                : 'No budget'}
            </p>
            {budget && (
              <p className="text-sm text-text-secondary mt-1.5">
                {Math.round(budgetPercent)}% used of {formatCurrency(budget.overall, hostCurrency)}
              </p>
            )}
          </GlassCard>
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Spending by category</h3>
              <SpendingDonut
                categoryTotals={summary?.categoryTotals || {}}
                total={totalSpent}
              />
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Budget progress</h3>
              <BudgetOverview
                budget={budget}
                categoryTotals={summary?.categoryTotals || {}}
              />
            </GlassCard>
          </motion.div>
        </div>

        {/* Monthly Trend */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Monthly spending trend</h3>
            <MonthlyTrend data={trendData} />
          </GlassCard>
        </motion.div>

        {/* Recent Expenses */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Recent expenses</h3>
            </div>
            <ExpenseList expenses={recentExpenses} emptyMessage="No expenses yet - add your first one." />
          </GlassCard>
        </motion.div>
      </motion.div>

      <ExpenseForm
        isOpen={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
        onSubmit={handleAddExpense}
      />
    </div>
  );
}
