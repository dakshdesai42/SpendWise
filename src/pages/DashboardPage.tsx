import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useFAB } from '../context/FABContext';
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns';
import { HiArrowTrendingDown, HiArrowTrendingUp, HiHome as HiHomeIcon, HiFire } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

import { getCurrentMonth, formatCurrency } from '../utils/formatters';
import { containerVariants, itemVariants } from '../utils/animations';
import { useDashboardData } from '../hooks/useDashboardData';
import { useUpcomingBills } from '../hooks/useUpcomingBills';
import { useAddExpense } from '../hooks/useExpenses';
import { useAddGoal, useApplyUnderspendToGoals } from '../hooks/useGoals';
import { useAutoPostRecurringForMonth } from '../hooks/useRecurring';
import { CATEGORY_MAP } from '../utils/constants';
import Header from '../components/layout/Header';
import GlassCard from '../components/ui/GlassCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PullToRefresh from '../components/ui/PullToRefresh';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ExpenseForm from '../components/expense/ExpenseForm';
import toast from 'react-hot-toast';
import { parseLocalDate } from '../utils/date';


const SpendingDonut = lazy(() => import('../components/charts/SpendingDonut'));
const MonthlyTrend = lazy(() => import('../components/charts/MonthlyTrend'));
const BudgetOverview = lazy(() => import('../components/budget/BudgetOverview'));
const DashboardDeferredSections = lazy(() => import('../components/dashboard/DashboardDeferredSections'));
const prefetchDashboardChunks = [
  () => import('../components/charts/SpendingDonut'),
  () => import('../components/charts/MonthlyTrend'),
  () => import('../components/budget/BudgetOverview'),
  () => import('../components/dashboard/DashboardDeferredSections'),
];

function InsightLoadingState() {
  return (
    <div className="h-64 flex items-center justify-center">
      <LoadingSpinner size="md" />
    </div>
  );
}

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
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [retryingData, setRetryingData] = useState(false);
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const currentMonth = getCurrentMonth();

  const {
    recentExpenses, summary, budget, goals,
    weeklyReview, trendData,
    isLoading: loading, hasError, refetchAll
  } = useDashboardData(user?.uid, currentMonth, demoMode);

  // Upcoming bills — fetched fresh from Firestore on every mount.
  // No React Query, no caching. Deleted rules can never appear.
  const {
    bills: upcomingBills,
    loading: upcomingBillsLoading,
    refetch: refetchUpcomingBills,
  } = useUpcomingBills(user?.uid, demoMode);

  const { mutateAsync: addExpenseMutate } = useAddExpense();
  const { mutateAsync: addGoalMutate } = useAddGoal();
  const { mutateAsync: applyUnderspendMutate } = useApplyUnderspendToGoals();
  const { mutateAsync: autoPostRecurring } = useAutoPostRecurringForMonth();

  useEffect(() => {
    if (user?.uid && !demoMode) {
      autoPostRecurring({ userId: user.uid, month: currentMonth }).catch(() => {
        // Non-blocking background sync.
      });
    }
  }, [user?.uid, currentMonth, demoMode, autoPostRecurring]);

  useEffect(() => {
    if (!loading) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTimedOut(true), 12000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    setShowDeferredSections(false);
  }, [user?.uid, currentMonth, demoMode]);

  useEffect(() => {
    let canceled = false;
    const warmup = () => {
      if (canceled) return;
      prefetchDashboardChunks.forEach((load) => {
        load().catch(() => {
          // Non-blocking preload.
        });
      });
    };

    if ('requestIdleCallback' in window) {
      const id = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(warmup);
      return () => {
        canceled = true;
        if ('cancelIdleCallback' in window) {
          (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
        }
      };
    }

    const timeout = window.setTimeout(warmup, 300);
    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      setShowDeferredSections(true);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [loading, user?.uid, currentMonth, demoMode]);

  // Register this page's add-expense action with the global FAB
  useEffect(() => {
    setFABAction(() => setShowExpenseForm(true));
    return () => setFABAction(null);
  }, []);

  async function handleRetryDataLoad() {
    setRetryingData(true);
    try {
      await Promise.allSettled([refetchAll(), refetchUpcomingBills()]);
    } finally {
      setRetryingData(false);
    }
  }

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
    const report = `SpendWise Monthly Summary (${currentMonth})
Spent: ${formatCurrency(totalSpent, hostCurrency)}
Transactions: ${summary?.transactionCount || 0}
Top category: ${topCategory.label}
Budget: ${budget ? `${Math.round(budgetPercent)}% used of ${formatCurrency(budget.overall, hostCurrency)}` : 'No budget set'}
Upcoming 30 days: ${formatCurrency(upcoming30Total, hostCurrency)}`;

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
    const content = `SpendWise Monthly Summary (${currentMonth})

- Total spent: ${formatCurrency(totalSpent, hostCurrency)}
- Transactions: ${summary?.transactionCount || 0}
- Top category: ${topCategory.label}
- Budget status: ${budget ? `${Math.round(budgetPercent)}% used` : 'No budget set'}
- Upcoming recurring (30 days): ${formatCurrency(upcoming30Total, hostCurrency)}
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
  const streak = profile?.currentStreak || 0;

  const {
    budgetRemaining,
    budgetPercent,
    burnRateLevel,
    elapsedPct,
    upcoming7,
    upcoming30Total,
    topCategory,
  } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const elapsedDays = Math.max(differenceInCalendarDays(now, monthStart) + 1, 1);
    const totalDays = differenceInCalendarDays(monthEnd, monthStart) + 1;
    const elapsedPercent = (elapsedDays / totalDays) * 100;

    const budgetPct = budget && budget.overall > 0 ? (totalSpent / budget.overall) * 100 : 0;
    const paceDiff = budget ? budgetPct - elapsedPercent : 0;
    const burn = paceDiff > 12 ? 'high' : paceDiff > 4 ? 'medium' : 'normal';

    // Safely compute upcoming bills derived values
    const safeBills = Array.isArray(upcomingBills) ? upcomingBills : [];
    const weekAhead = addDays(now, 7);
    const upcomingWeek = safeBills.filter((bill) => {
      const due = bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate);
      return !isNaN(due.getTime()) && due <= weekAhead;
    });
    const next30Total = safeBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);

    const categoryEntry = Object.entries(summary?.categoryTotals || {}).sort(([, a], [, b]) => b - a)[0];
    const category = CATEGORY_MAP[categoryEntry?.[0] || 'other'];

    return {
      budgetRemaining: budget ? budget.overall - totalSpent : null,
      budgetPercent: budgetPct,
      burnRateLevel: burn,
      elapsedPct: elapsedPercent,
      upcoming7: upcomingWeek,
      upcoming30Total: next30Total,
      topCategory: category,
    };
  }, [budget, totalSpent, upcomingBills, summary?.categoryTotals]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const loggedToday = recentExpenses.some(
    (e: any) => format(parseLocalDate(e.date), 'yyyy-MM-dd') === todayStr
  );
  const insightTabs = [
    { id: 'trend', label: 'Trend' },
    { id: 'category', label: 'Category' },
    { id: 'budget', label: 'Budget' },
  ];
  const trendChartKey = useMemo(
    () => `trend-${currentMonth}-${trendData.length}-${trendData.map((d) => d.total).join(',')}`,
    [currentMonth, trendData]
  );
  const categoryChartKey = useMemo(
    () => `category-${currentMonth}-${Object.values(summary?.categoryTotals || {}).join(',')}`,
    [currentMonth, summary?.categoryTotals]
  );
  if (loading && !loadingTimedOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRetryDataLoad}>
      <div>

        <Header onAddExpense={() => setShowExpenseForm(true)} />

        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="app-page-content space-y-12 md:space-y-14"
        >
          {(hasError || loadingTimedOut) && !demoMode && (
            <motion.div variants={itemVariants} className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
              <p className="text-sm text-warning">
                Some data could not be loaded. Please check your connection and try again.
              </p>
              <div className="mt-3">
                <Button size="sm" onClick={handleRetryDataLoad} loading={retryingData}>
                  Retry now
                </Button>
              </div>
            </motion.div>
          )}

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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2D8CFF] mb-3">Spent This Month</p>
                  <p className="text-[3rem] md:text-[4rem] font-light tracking-tight text-white leading-none">
                    {formatCurrency(totalSpent, hostCurrency)}
                  </p>
                  <p className="text-sm text-white/40 mt-3 font-medium">
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
                <p className="text-[9px] text-text-tertiary mt-1">Based on rates at time of entry</p>
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
                <div className="flex bg-[#18181A] rounded-full p-1 border border-white/[0.06]">
                  {insightTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveInsight(tab.id)}
                      className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors ${activeInsight === tab.id
                        ? 'bg-[#2D8CFF] text-white shadow-[0_2px_8px_rgba(45,140,255,0.4)]'
                        : 'text-white/50 hover:text-white/80'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeInsight === 'category' && (
                <Suspense fallback={<InsightLoadingState />}>
                  <SpendingDonut
                    key={categoryChartKey}
                    categoryTotals={summary?.categoryTotals || {}}
                    total={totalSpent}
                  />
                </Suspense>
              )}
              {activeInsight === 'budget' && (
                <Suspense fallback={<InsightLoadingState />}>
                  <BudgetOverview
                    budget={budget}
                    categoryTotals={summary?.categoryTotals || {}}
                  />
                </Suspense>
              )}
              {activeInsight === 'trend' && (
                <Suspense fallback={<InsightLoadingState />}>
                  <MonthlyTrend key={trendChartKey} data={trendData} />
                </Suspense>
              )}
            </GlassCard>
          </motion.div>

          <Suspense
            fallback={(
              <motion.div variants={itemVariants}>
                <GlassCard className="p-7 md:p-8">
                  <div className="h-28 flex items-center justify-center">
                    <LoadingSpinner size="md" />
                  </div>
                </GlassCard>
              </motion.div>
            )}
          >
            {showDeferredSections ? (
              <DashboardDeferredSections
                hostCurrency={hostCurrency}
                currentMonth={currentMonth}
                summary={summary}
                upcoming30Total={upcoming30Total}
                upcomingBills={upcomingBills}
                upcomingBillsLoading={upcomingBillsLoading}
                upcoming7={upcoming7}
                weeklyReview={weeklyReview}
                goals={goals}
                topCategoryLabel={topCategory.label}
                totalSpent={totalSpent}
                recentExpenses={recentExpenses}
                onApplyUnderspend={handleApplyUnderspend}
                onAddGoal={() => setShowGoalModal(true)}
                onShareMonthlySummary={handleShareMonthlySummary}
                onDownloadMonthlySummary={handleDownloadMonthlySummary}
              />
            ) : (
              <motion.div variants={itemVariants}>
                <GlassCard className="p-7 md:p-8">
                  <div className="h-28 flex items-center justify-center">
                    <LoadingSpinner size="md" />
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </Suspense>
        </motion.div>

        {showExpenseForm && (
          <ExpenseForm
            isOpen={showExpenseForm}
            onClose={() => setShowExpenseForm(false)}
            onSubmit={handleAddExpense}
          />
        )}

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
    </PullToRefresh>
  );
}
