import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFAB } from '../context/FABContext';
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns';
import { HiArrowTrendingDown, HiArrowTrendingUp, HiHome as HiHomeIcon, HiFire, HiPlus, HiShare } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

import { getCurrentMonth, formatCurrency } from '../utils/formatters';
import { containerVariants, itemVariants } from '../utils/animations';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAddExpense } from '../hooks/useExpenses';
import { useAddGoal, useApplyUnderspendToGoals } from '../hooks/useGoals';
import { useAutoPostRecurringForMonth } from '../hooks/useRecurring';
import { CATEGORY_MAP } from '../utils/constants';
import Header from '../components/layout/Header';
import GlassCard from '../components/ui/GlassCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ExpenseForm from '../components/expense/ExpenseForm';
import ExpenseList from '../components/expense/ExpenseList';
import SpendingDonut from '../components/charts/SpendingDonut';
import MonthlyTrend from '../components/charts/MonthlyTrend';
import BudgetOverview from '../components/budget/BudgetOverview';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user, profile, demoMode } = useAuth();
  const { hostCurrency, homeCurrency } = useCurrency();
  const { setFABAction } = useFAB();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [activeInsight, setActiveInsight] = useState('trend');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const currentMonth = getCurrentMonth();

  const {
    recentExpenses, summary, budget, goals, upcomingBills,
    weeklyReview, trendData, isLoading: loading
  } = useDashboardData(user?.uid, currentMonth, demoMode);

  const { mutateAsync: addExpenseMutate } = useAddExpense();
  const { mutateAsync: addGoalMutate } = useAddGoal();
  const { mutateAsync: applyUnderspendMutate } = useApplyUnderspendToGoals();
  const { mutateAsync: autoPostRecurring } = useAutoPostRecurringForMonth();

  useEffect(() => {
    if (user?.uid && !demoMode) {
      autoPostRecurring({ userId: user.uid, month: currentMonth });
    }
  }, [user?.uid, currentMonth, demoMode, autoPostRecurring]);

  // Register this page's add-expense action with the global FAB
  useEffect(() => {
    setFABAction(() => setShowExpenseForm(true));
    return () => setFABAction(null);
  }, []);

  async function handleAddExpense(data: any) {
    if (demoMode) {
      toast.success('Expense added! (Demo mode)');
      return;
    }
    try {
      await addExpenseMutate({ userId: user!.uid, data });
      toast.success('Expense added!');
    } catch (err) {
      toast.error('Failed to add expense');
    }
  }

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalTitle.trim() || !goalAmount || parseFloat(goalAmount) <= 0) return;

    if (demoMode) {
      toast.success('Goal created! (Demo mode)');
      setGoalTitle('');
      setGoalAmount('');
      setGoalDate('');
      setShowGoalModal(false);
      return;
    }

    setSavingGoal(true);
    try {
      await addGoalMutate({
        userId: user!.uid,
        goalData: {
          title: goalTitle.trim(),
          targetAmount: parseFloat(goalAmount),
          targetDate: goalDate || null,
        }
      });
      toast.success('Goal created');
      setGoalTitle('');
      setGoalAmount('');
      setGoalDate('');
      setShowGoalModal(false);
    } catch (err) {
      toast.error('Failed to create goal');
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleApplyUnderspend() {
    const available = Math.max(budgetRemaining || 0, 0);
    if (available <= 0) {
      toast.error('No underspend available to allocate');
      return;
    }

    if (demoMode) {
      toast.success('Applied this month underspend to goals (Demo mode)');
      return;
    }

    try {
      await applyUnderspendMutate({ userId: user!.uid, amount: available });
      toast.success('Applied underspend to your active goals');
    } catch (err) {
      toast.error('Failed to apply underspend');
    }
  }

  async function handleShareMonthlySummary() {
    const topCategoryEntry: any = Object.entries(summary?.categoryTotals || {}).sort((a: any, b: any) => b[1] - a[1])[0];
    const topCategory = CATEGORY_MAP[topCategoryEntry?.[0] || 'other'];
    const report = `SpendWise Monthly Summary (${currentMonth})
Spent: ${formatCurrency(totalSpent, hostCurrency)}
Transactions: ${summary?.transactionCount || 0}
Top category: ${topCategory.label} (${formatCurrency((topCategoryEntry as any)?.[1] || 0, hostCurrency)})
Budget: ${budget ? `${Math.round(budgetPercent)}% used of ${formatCurrency(budget.overall, hostCurrency)}` : 'No budget set'}
Upcoming 30 days: ${formatCurrency(upcomingBills.reduce((sum, b: any) => sum + b.amount, 0), hostCurrency)}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'SpendWise Monthly Summary', text: report });
      } else {
        await navigator.clipboard.writeText(report);
        toast.success('Monthly summary copied to clipboard');
      }
    } catch {
      toast('Share canceled');
    }
  }

  function handleDownloadMonthlySummary() {
    const topCategoryEntry: any = Object.entries(summary?.categoryTotals || {}).sort((a: any, b: any) => b[1] - a[1])[0];
    const topCategory = CATEGORY_MAP[topCategoryEntry?.[0] || 'other'];
    const content = `SpendWise Monthly Summary (${currentMonth})

- Total spent: ${formatCurrency(totalSpent, hostCurrency)}
- Transactions: ${summary?.transactionCount || 0}
- Top category: ${topCategory.label} (${formatCurrency(topCategoryEntry?.[1] || 0, hostCurrency)})
- Budget status: ${budget ? `${Math.round(budgetPercent)}% used` : 'No budget set'}
- Upcoming recurring (30 days): ${formatCurrency(upcomingBills.reduce((sum, b: any) => sum + b.amount, 0), hostCurrency)}
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendwise-summary-${currentMonth}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalSpent = summary?.totalSpent || 0;
  const totalSpentHome = summary?.totalSpentHome || 0;
  const budgetRemaining = budget ? budget.overall - totalSpent : null;
  const budgetPercent = budget ? (totalSpent / budget.overall) * 100 : 0;
  const streak = profile?.currentStreak || 0;
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const elapsedDays = Math.max(differenceInCalendarDays(new Date(), monthStart) + 1, 1);
  const totalDays = differenceInCalendarDays(monthEnd, monthStart) + 1;
  const elapsedPct = (elapsedDays / totalDays) * 100;
  const paceDiff = budget ? budgetPercent - elapsedPct : 0;
  const burnRateLevel = paceDiff > 12 ? 'high' : paceDiff > 4 ? 'medium' : 'normal';
  const upcoming7 = upcomingBills.filter((b: any) => b.dueDate <= addDays(new Date(), 7));
  const upcoming30Total = upcomingBills.reduce((sum, bill: any) => sum + bill.amount, 0);
  const topCategoryEntry = Object.entries(summary?.categoryTotals || {}).sort((a: any, b: any) => b[1] - a[1])[0];
  const topCategory = CATEGORY_MAP[topCategoryEntry?.[0] || 'other'];

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const loggedToday = recentExpenses.some(
    (e: any) => format(new Date(e.date), 'yyyy-MM-dd') === todayStr
  );
  const insightTabs = [
    { id: 'trend', label: 'Trend' },
    { id: 'category', label: 'Category' },
    { id: 'budget', label: 'Budget' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="pt-1 md:pt-2">
      <Header onAddExpense={() => setShowExpenseForm(true)} />

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="space-y-12 md:space-y-14 mt-4 md:mt-5"
      >
        {(demoMode || streak > 0 || (!loggedToday && !demoMode && recentExpenses.length > 0)) && (
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2.5">
            {demoMode && (
              <span className="text-xs px-2.5 py-1 rounded-full border border-accent-secondary/25 bg-accent-secondary/10 text-accent-secondary">
                Demo mode enabled
              </span>
            )}
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-orange-400/25 bg-orange-400/10 text-orange-300">
                <HiFire className="w-3.5 h-3.5" />
                {streak} day streak
              </span>
            )}
            {!loggedToday && !demoMode && recentExpenses.length > 0 && (
              <button
                onClick={() => setShowExpenseForm(true)}
                className="text-xs px-2.5 py-1 rounded-full border border-accent-primary/25 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/15 transition-colors"
              >
                Nothing logged today. Add expense
              </button>
            )}
          </motion.div>
        )}

        {/* Stat Cards */}
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Hero spend card — the one number that matters most */}
          <GlassCard className="p-7 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-text-secondary mb-2">Spent This Month</p>
                <p className="text-5xl md:text-6xl font-semibold tracking-tighter text-text-primary leading-none">
                  {formatCurrency(totalSpent, hostCurrency)}
                </p>
                <p className="text-sm text-text-tertiary mt-2.5">
                  ≈ {formatCurrency(totalSpentHome, homeCurrency)} &middot; {summary?.transactionCount || 0} transactions
                </p>
              </div>

              {/* Budget status pill — the key answer */}
              {budget ? (
                <div className={`shrink-0 flex flex-col items-end gap-1.5`}>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${budgetPercent > 100
                    ? 'bg-danger/15 text-danger'
                    : budgetPercent > 85
                      ? 'bg-warning/15 text-warning'
                      : 'bg-success/15 text-success'
                    }`}>
                    {budgetPercent > 100 ? '🔴 Over budget' : budgetPercent > 85 ? '⚠️ Watch it' : '✅ On track'}
                  </span>
                  <p className="text-xs text-text-tertiary text-right">
                    {Math.round(budgetPercent)}% of {formatCurrency(budget.overall, hostCurrency)}
                  </p>
                </div>
              ) : (
                <span className="text-xs text-text-tertiary shrink-0 px-3 py-1.5 rounded-full border border-white/[0.08]">
                  No budget set
                </span>
              )}
            </div>

            {/* Budget progress bar */}
            {budget && (
              <div className="mt-5">
                <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${budgetPercent > 100 ? 'bg-danger' : budgetPercent > 85 ? 'bg-warning' : 'bg-success'
                      }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(budgetPercent, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
              </div>
            )}
          </GlassCard>

          {/* Secondary stats row */}
          <div className="grid grid-cols-2 gap-4">
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-accent-secondary/15">
                  <HiHomeIcon className="w-4 h-4 text-accent-secondary" />
                </div>
                <span className="text-xs text-text-secondary">Home Currency</span>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-text-primary">
                {formatCurrency(totalSpentHome, homeCurrency)}
              </p>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${burnRateLevel === 'high' ? 'bg-danger/15' : burnRateLevel === 'medium' ? 'bg-warning/15' : 'bg-success/15'}`}>
                  {burnRateLevel === 'high'
                    ? <HiArrowTrendingUp className="w-4 h-4 text-danger" />
                    : <HiArrowTrendingDown className="w-4 h-4 text-success" />
                  }
                </div>
                <span className="text-xs text-text-secondary">Burn Rate</span>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-text-primary capitalize">{burnRateLevel}</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">{Math.round(elapsedPct)}% of month elapsed</p>
            </GlassCard>
          </div>
        </motion.div>

        {/* Insights */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-7 md:p-9">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 mb-7">
              <h3 className="text-sm font-semibold text-text-primary">Insights</h3>
              <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.07] p-1">
                {insightTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInsight(tab.id)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${activeInsight === tab.id
                      ? 'bg-accent-primary/15 text-accent-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeInsight === 'category' && (
              <SpendingDonut
                categoryTotals={summary?.categoryTotals || {}}
                total={totalSpent}
              />
            )}
            {activeInsight === 'budget' && (
              <BudgetOverview
                budget={budget}
                categoryTotals={summary?.categoryTotals || {}}
              />
            )}
            {activeInsight === 'trend' && (
              <MonthlyTrend data={trendData} />
            )}
          </GlassCard>
        </motion.div>

        {/* Upcoming Bills */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-7 md:p-9">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-text-primary">Upcoming Bills</h3>
              <span className="text-xs text-text-tertiary">
                Next 30 days: {formatCurrency(upcoming30Total, hostCurrency)}
              </span>
            </div>
            {upcomingBills.length === 0 ? (
              <p className="text-sm text-text-tertiary">No upcoming recurring bills.</p>
            ) : (
              <div className="space-y-3">
                {upcomingBills.slice(0, 6).map((bill: any, idx) => {
                  const cat = CATEGORY_MAP[bill.category as keyof typeof CATEGORY_MAP] || CATEGORY_MAP.other;
                  return (
                    <div key={`${bill.recurringId}-${idx}`} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">{bill.note || cat.label}</p>
                        <p className="text-xs text-text-tertiary">
                          {format(bill.dueDate, 'EEE, MMM d')} • {bill.frequency}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-text-primary">{formatCurrency(bill.amount, hostCurrency)}</span>
                    </div>
                  );
                })}
                {upcoming7.length > 0 && (
                  <p className="text-xs text-warning">
                    {upcoming7.length} bill{upcoming7.length > 1 ? 's' : ''} due in the next 7 days.
                  </p>
                )}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Weekly Review */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-7 md:p-8">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Weekly Review</h3>
            {weeklyReview ? (
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  {weeklyReview.count} expense{weeklyReview.count !== 1 ? 's' : ''} this week totaling {formatCurrency(weeklyReview.total, hostCurrency)}.
                </p>
                <p className="text-xs text-text-tertiary">
                  Top category: {weeklyReview.topCategory?.label || 'Other'}
                  {weeklyReview.biggest ? ` • Biggest: ${weeklyReview.biggest.note || 'Expense'} (${formatCurrency(weeklyReview.biggest.amount, hostCurrency)})` : ''}
                </p>
                <p className="text-xs text-accent-secondary">{weeklyReview.action}</p>
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">Not enough data for weekly review yet.</p>
            )}
          </GlassCard>
        </motion.div>

        {/* Goals */}

        <motion.div variants={itemVariants}>
          <GlassCard className="p-7 md:p-9">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-text-primary">Savings Goals</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={handleApplyUnderspend}>Apply Underspend</Button>
                <Button size="sm" onClick={() => setShowGoalModal(true)} icon={<HiPlus className="w-4 h-4" />}>Add Goal</Button>
              </div>
            </div>
            {goals.length === 0 ? (
              <p className="text-sm text-text-tertiary">No goals yet. Create your first goal.</p>
            ) : (
              <div className="space-y-4">
                {goals.map((goal: any) => {
                  const progress = goal.targetAmount > 0 ? Math.min((goal.currentSaved / goal.targetAmount) * 100, 100) : 0;
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-text-primary">{goal.title}</p>
                          <p className="text-xs text-text-tertiary">
                            {formatCurrency(goal.currentSaved || 0, hostCurrency)} / {formatCurrency(goal.targetAmount || 0, hostCurrency)}
                            {goal.targetDate ? ` • target ${format(new Date(goal.targetDate), 'MMM d, yyyy')}` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-text-secondary">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                        <div className="h-full rounded-full bg-accent-primary" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Monthly Share Card */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-7 md:p-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Monthly Summary</h3>
              <span className="text-xs text-text-tertiary">{currentMonth}</span>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              You spent {formatCurrency(totalSpent, hostCurrency)} across {summary?.transactionCount || 0} transactions.
              Top category was {topCategory.label}.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleShareMonthlySummary} icon={<HiShare className="w-4 h-4" />}>Share</Button>
              <Button size="sm" variant="secondary" onClick={handleDownloadMonthlySummary}>Download</Button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Expenses */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-7 md:p-9">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-text-primary">Recent Expenses</h3>
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

      <Modal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} title="Create Savings Goal">
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <Input
            label="Goal Name"
            placeholder="e.g. Summer Trip"
            value={goalTitle}
            onChange={(e: any) => setGoalTitle(e.target.value)}
          />
          <Input
            label="Target Amount"
            type="number"
            min="1"
            step="0.01"
            placeholder="0.00"
            value={goalAmount}
            onChange={(e: any) => setGoalAmount(e.target.value)}
          />
          <Input
            label="Target Date (optional)"
            type="date"
            value={goalDate}
            onChange={(e: any) => setGoalDate(e.target.value)}
          />
          <Button
            type="submit"
            className="w-full"
            loading={savingGoal}
            disabled={!goalTitle.trim() || !goalAmount || parseFloat(goalAmount) <= 0}
          >
            Save Goal
          </Button>
        </form>
      </Modal>
    </div>
  );
}
