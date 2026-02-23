import { useQuery } from '@tanstack/react-query';
import {
    getRecentExpenses,
    getMonthlySummary,
    getMultipleMonthSummaries,
    getExpensesInRange
} from '../services/expenses';
import { getBudget } from '../services/budgets';
import { getRecurringExpenses, getUpcomingRecurringBills, getUpcomingRecurringBillsForUser } from '../services/recurring';
import { getGoals } from '../services/goals';
import { format, subMonths, startOfWeek, endOfWeek, subWeeks, endOfDay } from 'date-fns';
import { CATEGORY_MAP } from '../utils/constants';
import { DEMO_EXPENSES, DEMO_SUMMARY, DEMO_BUDGET, DEMO_TREND, DEMO_RECURRING, DEMO_GOALS } from '../utils/demoData';
import { Expense, UpcomingBill, WeeklyReview } from '../types/models';
import { parseMonthKey } from '../utils/date';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        }),
    ]);
}

function buildWeeklyReviewFromExpenses(thisWeekExpenses: Expense[] = [], prevWeekExpenses: Expense[] = []): WeeklyReview {
    const total = thisWeekExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const prevTotal = prevWeekExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    const categoryTotals = thisWeekExpenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    const topCategoryId = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0]?.[0];
    const topCategory = CATEGORY_MAP[topCategoryId] || CATEGORY_MAP.other;
    const biggest = [...thisWeekExpenses].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];

    let action: string;
    if (prevTotal === 0 && total > 0) {
        action = 'First week of tracking! Keep logging expenses to build your baseline.';
    } else if (change > 10) {
        action = 'Spending pace is high this week. Consider a low-spend weekend.';
    } else if (change < -10) {
        action = 'Great job! Spending is down from last week.';
    } else {
        action = 'Your spend pace is stable. Keep your current routine.';
    }

    return {
        total,
        count: thisWeekExpenses.length,
        change,
        topCategory,
        biggest,
        action,
    };
}

export function useDashboardData(userId: string | undefined, currentMonth: string, demoMode: boolean = false) {
    const queryTimeoutMs = 12000;

    // Queries
    const recentQuery = useQuery({
        queryKey: ['expenses', 'recent', userId, 5],
        queryFn: () => withTimeout(getRecentExpenses(userId!, 5), queryTimeoutMs, 'Recent expenses'),
        enabled: !!userId && !demoMode,
    });

    const summaryQuery = useQuery({
        queryKey: ['expenses', 'summary', userId, currentMonth],
        queryFn: () => withTimeout(getMonthlySummary(userId!, currentMonth), queryTimeoutMs, 'Monthly summary'),
        enabled: !!userId && !demoMode,
    });

    const budgetQuery = useQuery({
        queryKey: ['budgets', userId, currentMonth],
        queryFn: () => withTimeout(getBudget(userId!, currentMonth), queryTimeoutMs, 'Budget'),
        enabled: !!userId && !demoMode,
    });

    const goalsQuery = useQuery({
        queryKey: ['goals', userId],
        queryFn: () => withTimeout(getGoals(userId!), queryTimeoutMs, 'Goals'),
        enabled: !!userId && !demoMode,
    });

    const recurringQuery = useQuery({
        queryKey: ['recurring', userId],
        queryFn: () => withTimeout(getRecurringExpenses(userId!), queryTimeoutMs, 'Recurring expenses'),
        enabled: !!userId && !demoMode,
    });

    // Upcoming bills — self-contained query that fetches its own rules fresh
    // from Firestore every time. Uses staleTime: 0 and refetchOnMount: 'always'
    // to override global defaults (staleTime: 30s) so deleted recurring rules
    // are never shown from stale cache.
    const upcomingBillsQuery = useQuery<UpcomingBill[]>({
        queryKey: ['recurring', 'upcoming', userId],
        queryFn: async () => {
            const rules = await getRecurringExpenses(userId!);
            return getUpcomingRecurringBillsForUser(userId!, rules, new Date(), 30);
        },
        enabled: !!userId && !demoMode,
        staleTime: 0,
        refetchOnMount: 'always',
    });

    // Trend data query (Last 6 months)
    const trendMonths = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'yyyy-MM'));
    const trendQuery = useQuery({
        queryKey: ['expenses', 'summaries', userId, trendMonths],
        queryFn: () => withTimeout(getMultipleMonthSummaries(userId!, trendMonths), queryTimeoutMs, 'Trend summaries'),
        enabled: !!userId && !demoMode,
    });

    // Weekly review queries
    const weekEnd = endOfDay(new Date());
    const weekStart = startOfWeek(weekEnd, { weekStartsOn: 1 });
    const prevWeekEnd = subWeeks(weekEnd, 1);
    const prevWeekStart = startOfWeek(prevWeekEnd, { weekStartsOn: 1 });
    const thisWeekKey = `${format(weekStart, 'yyyy-MM-dd')}..${format(weekEnd, 'yyyy-MM-dd')}`;
    const prevWeekRangeEnd = endOfWeek(prevWeekStart, { weekStartsOn: 1 });
    const prevWeekKey = `${format(prevWeekStart, 'yyyy-MM-dd')}..${format(prevWeekRangeEnd, 'yyyy-MM-dd')}`;

    const thisWeekQuery = useQuery({
        queryKey: ['expenses', 'range', userId, thisWeekKey],
        queryFn: () => withTimeout(getExpensesInRange(userId!, weekStart, weekEnd), queryTimeoutMs, 'This week expenses'),
        enabled: !!userId && !demoMode,
    });

    const prevWeekQuery = useQuery({
        queryKey: ['expenses', 'range', userId, prevWeekKey],
        queryFn: () => withTimeout(getExpensesInRange(userId!, prevWeekStart, prevWeekRangeEnd), queryTimeoutMs, 'Previous week expenses'),
        enabled: !!userId && !demoMode,
    });

    // Derived data
    const upcomingBills = demoMode
        ? getUpcomingRecurringBills(DEMO_RECURRING, new Date(), 30)
        : (upcomingBillsQuery.data ?? []);

    const trendData = demoMode
        ? DEMO_TREND
        : trendMonths.map((m) => ({
            month: format(parseMonthKey(m), 'MMM'),
            total: trendQuery.data?.[m]?.totalSpent || 0,
        }));

    const weeklyReview = demoMode
        ? buildWeeklyReviewFromExpenses(DEMO_EXPENSES)
        : (thisWeekQuery.isSuccess || prevWeekQuery.isSuccess)
            ? buildWeeklyReviewFromExpenses(thisWeekQuery.data || [], prevWeekQuery.data || [])
            : null;

    const criticalQueries = [
        recentQuery,
        summaryQuery,
        budgetQuery,
        goalsQuery,
        recurringQuery,
        trendQuery,
    ];

    const isLoading = !demoMode && criticalQueries.some((q) => q.isLoading);

    const hasError = !demoMode && criticalQueries.some((q) => q.isError);

    const firstError = criticalQueries
        .map((q) => q.error)
        .find(Boolean) as Error | undefined;

    const errorMessage = firstError?.message || null;
    const debugStatus = [
        `recent:${recentQuery.status}/${recentQuery.fetchStatus}`,
        `summary:${summaryQuery.status}/${summaryQuery.fetchStatus}`,
        `budget:${budgetQuery.status}/${budgetQuery.fetchStatus}`,
        `goals:${goalsQuery.status}/${goalsQuery.fetchStatus}`,
        `recurring:${recurringQuery.status}/${recurringQuery.fetchStatus}`,
        `trend:${trendQuery.status}/${trendQuery.fetchStatus}`,
        `thisWeek:${thisWeekQuery.status}/${thisWeekQuery.fetchStatus}`,
        `prevWeek:${prevWeekQuery.status}/${prevWeekQuery.fetchStatus}`,
    ].join(' | ');

    async function refetchAll() {
        await Promise.allSettled([
            recentQuery.refetch(),
            summaryQuery.refetch(),
            budgetQuery.refetch(),
            goalsQuery.refetch(),
            recurringQuery.refetch(),
            upcomingBillsQuery.refetch(),
            trendQuery.refetch(),
            thisWeekQuery.refetch(),
            prevWeekQuery.refetch(),
        ]);
    }

    const upcomingBillsLoading = !demoMode && upcomingBillsQuery.isLoading;

    return {
        recentExpenses: demoMode ? DEMO_EXPENSES.slice(0, 5) : (recentQuery.data || []),
        summary: demoMode ? DEMO_SUMMARY : (summaryQuery.data || null),
        budget: demoMode ? DEMO_BUDGET : (budgetQuery.data || null),
        goals: demoMode ? DEMO_GOALS : (goalsQuery.data || []),
        upcomingBills,
        upcomingBillsLoading,
        weeklyReview,
        trendData,
        isLoading,
        hasError,
        errorMessage,
        debugStatus,
        refetchAll
    };
}
