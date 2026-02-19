import { useQuery } from '@tanstack/react-query';
import {
    getRecentExpenses,
    getMonthlySummary,
    getMultipleMonthSummaries,
    getExpensesInRange
} from '../services/expenses';
import { getBudget } from '../services/budgets';
import { getRecurringExpenses, getUpcomingRecurringBills } from '../services/recurring';
import { getGoals } from '../services/goals';
import { format, subMonths, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { CATEGORY_MAP } from '../utils/constants';
import { DEMO_EXPENSES, DEMO_SUMMARY, DEMO_BUDGET, DEMO_TREND, DEMO_RECURRING, DEMO_GOALS } from '../utils/demoData';
import { Expense, WeeklyReview } from '../types/models';

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

    return {
        total,
        count: thisWeekExpenses.length,
        change,
        topCategory,
        biggest,
        action: change > 10 ? 'Spending pace is high this week. Consider a low-spend weekend.' : 'Your spend pace is stable. Keep your current routine.',
    };
}

export function useDashboardData(userId: string | undefined, currentMonth: string, demoMode: boolean = false) {
    // Queries
    const recentQuery = useQuery({
        queryKey: ['expenses', 'recent', userId, 5],
        queryFn: () => getRecentExpenses(userId!, 5),
        enabled: !!userId && !demoMode,
    });

    const summaryQuery = useQuery({
        queryKey: ['expenses', 'summary', userId, currentMonth],
        queryFn: () => getMonthlySummary(userId!, currentMonth),
        enabled: !!userId && !demoMode,
    });

    const budgetQuery = useQuery({
        queryKey: ['budgets', userId, currentMonth],
        queryFn: () => getBudget(userId!, currentMonth),
        enabled: !!userId && !demoMode,
    });

    const goalsQuery = useQuery({
        queryKey: ['goals', userId],
        queryFn: () => getGoals(userId!),
        enabled: !!userId && !demoMode,
    });

    const recurringQuery = useQuery({
        queryKey: ['recurring', userId],
        queryFn: () => getRecurringExpenses(userId!),
        enabled: !!userId && !demoMode,
    });

    // Trend data query (Last 6 months)
    const trendMonths = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'yyyy-MM'));
    const trendQuery = useQuery({
        queryKey: ['expenses', 'summaries', userId, trendMonths],
        queryFn: () => getMultipleMonthSummaries(userId!, trendMonths),
        enabled: !!userId && !demoMode,
    });

    // Weekly review queries
    const weekEnd = new Date();
    const weekStart = startOfWeek(weekEnd, { weekStartsOn: 1 });
    const prevWeekEnd = subWeeks(weekEnd, 1);
    const prevWeekStart = startOfWeek(prevWeekEnd, { weekStartsOn: 1 });

    const thisWeekQuery = useQuery({
        queryKey: ['expenses', 'range', userId, weekStart.toISOString(), weekEnd.toISOString()],
        queryFn: () => getExpensesInRange(userId!, weekStart, weekEnd),
        enabled: !!userId && !demoMode,
    });

    const prevWeekQuery = useQuery({
        queryKey: ['expenses', 'range', userId, prevWeekStart.toISOString(), endOfWeek(prevWeekStart, { weekStartsOn: 1 }).toISOString()],
        queryFn: () => getExpensesInRange(userId!, prevWeekStart, endOfWeek(prevWeekStart, { weekStartsOn: 1 })),
        enabled: !!userId && !demoMode,
    });

    // Derived data
    const upcomingBills = demoMode
        ? getUpcomingRecurringBills(DEMO_RECURRING, new Date(), 30)
        : recurringQuery.data ? getUpcomingRecurringBills(recurringQuery.data, new Date(), 30) : [];

    const trendData = demoMode
        ? DEMO_TREND
        : trendMonths.map((m) => ({
            month: format(new Date(m + '-01'), 'MMM'),
            total: trendQuery.data?.[m]?.totalSpent || 0,
        }));

    const weeklyReview = demoMode
        ? buildWeeklyReviewFromExpenses(DEMO_EXPENSES)
        : thisWeekQuery.data && prevWeekQuery.data
            ? buildWeeklyReviewFromExpenses(thisWeekQuery.data, prevWeekQuery.data)
            : null;

    const isLoading = !demoMode && (
        recentQuery.isLoading || summaryQuery.isLoading || budgetQuery.isLoading ||
        goalsQuery.isLoading || recurringQuery.isLoading || trendQuery.isLoading ||
        thisWeekQuery.isLoading || prevWeekQuery.isLoading
    );

    return {
        recentExpenses: demoMode ? DEMO_EXPENSES.slice(0, 5) : (recentQuery.data || []),
        summary: demoMode ? DEMO_SUMMARY : (summaryQuery.data || null),
        budget: demoMode ? DEMO_BUDGET : (budgetQuery.data || null),
        goals: demoMode ? DEMO_GOALS : (goalsQuery.data || []),
        upcomingBills,
        weeklyReview,
        trendData,
        isLoading
    };
}
