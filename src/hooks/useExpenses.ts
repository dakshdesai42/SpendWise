import { QueryClient, QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getRecentExpenses,
    getMonthlySummary,
    getMultipleMonthSummaries,
    getExpensesInRange,
    getExpensesByMonth,
    addExpense,
    updateExpense,
    deleteExpense
} from '../services/expenses';
import { Expense, MonthlySummary } from '../types/models';
import { formatMonthKey, parseLocalDate } from '../utils/date';

type ExpenseCacheSnapshot = {
    recent: Array<[QueryKey, Expense[] | undefined]>;
    month: Array<[QueryKey, Expense[] | undefined]>;
    summary: Array<[QueryKey, MonthlySummary | null | undefined]>;
};

type ExpenseMutationContext = {
    snapshots: ExpenseCacheSnapshot;
    optimisticExpense?: Expense;
    previousExpense?: Expense | null;
    nextExpense?: Expense | null;
};

function getRecentLimit(key: QueryKey, fallback: number): number {
    if (!Array.isArray(key)) return fallback;
    const raw = key[3];
    return typeof raw === 'number' ? raw : fallback;
}

function getMonthKeyFromQueryKey(key: QueryKey): string | null {
    if (!Array.isArray(key)) return null;
    const raw = key[3];
    return typeof raw === 'string' ? raw : null;
}

function toCachedExpense(expense: Expense): Expense {
    const date = parseLocalDate(expense.date);
    return {
        ...expense,
        date,
        month: expense.month ?? formatMonthKey(date),
        amountHome: expense.amountHome ?? 0,
    };
}

function sortExpensesByDateDesc(expenses: Expense[]): Expense[] {
    return [...expenses].sort(
        (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
    );
}

function captureExpenseSnapshots(queryClient: QueryClient, userId: string): ExpenseCacheSnapshot {
    return {
        recent: queryClient.getQueriesData<Expense[]>({ queryKey: ['expenses', 'recent', userId] }),
        month: queryClient.getQueriesData<Expense[]>({ queryKey: ['expenses', 'month', userId] }),
        summary: queryClient.getQueriesData<MonthlySummary | null>({ queryKey: ['expenses', 'summary', userId] }),
    };
}

function restoreExpenseSnapshots(queryClient: QueryClient, snapshots: ExpenseCacheSnapshot): void {
    for (const [key, data] of snapshots.recent) {
        if (data !== undefined) queryClient.setQueryData(key, data);
    }
    for (const [key, data] of snapshots.month) {
        if (data !== undefined) queryClient.setQueryData(key, data);
    }
    for (const [key, data] of snapshots.summary) {
        if (data !== undefined) queryClient.setQueryData(key, data);
    }
}

function updateRecentCaches(
    queryClient: QueryClient,
    userId: string,
    updater: (current: Expense[], limit: number) => Expense[]
): void {
    const entries = queryClient.getQueriesData<Expense[]>({ queryKey: ['expenses', 'recent', userId] });
    for (const [key, current] of entries) {
        if (!current) continue;
        const limit = getRecentLimit(key, current.length);
        queryClient.setQueryData<Expense[]>(key, updater(current, limit));
    }
}

function updateMonthCaches(
    queryClient: QueryClient,
    userId: string,
    updater: (month: string, current: Expense[]) => Expense[]
): void {
    const entries = queryClient.getQueriesData<Expense[]>({ queryKey: ['expenses', 'month', userId] });
    for (const [key, current] of entries) {
        if (!current) continue;
        const month = getMonthKeyFromQueryKey(key);
        if (!month) continue;
        queryClient.setQueryData<Expense[]>(key, updater(month, current));
    }
}

function applySummaryTransition(
    current: MonthlySummary | null | undefined,
    fromExpense: Expense | null,
    toExpense: Expense | null
): MonthlySummary | null {
    let totalSpent = current?.totalSpent ?? 0;
    let totalSpentHome = current?.totalSpentHome ?? 0;
    let transactionCount = current?.transactionCount ?? 0;
    const categoryTotals: Record<string, number> = { ...(current?.categoryTotals ?? {}) };

    const apply = (expense: Expense, direction: 1 | -1) => {
        const amount = expense.amount || 0;
        const amountHome = expense.amountHome ?? 0;
        const category = expense.category || 'other';
        totalSpent += direction * amount;
        totalSpentHome += direction * amountHome;
        transactionCount += direction;

        const nextCategoryTotal = (categoryTotals[category] ?? 0) + direction * amount;
        if (nextCategoryTotal <= 0) {
            delete categoryTotals[category];
        } else {
            categoryTotals[category] = nextCategoryTotal;
        }
    };

    if (fromExpense) apply(fromExpense, -1);
    if (toExpense) apply(toExpense, 1);

    totalSpent = Math.max(0, totalSpent);
    totalSpentHome = Math.max(0, totalSpentHome);
    transactionCount = Math.max(0, transactionCount);

    if (transactionCount === 0) return null;

    return {
        totalSpent,
        totalSpentHome,
        transactionCount,
        categoryTotals,
    };
}

function updateSummaryCaches(
    queryClient: QueryClient,
    userId: string,
    updater: (month: string, current: MonthlySummary | null) => MonthlySummary | null
): void {
    const entries = queryClient.getQueriesData<MonthlySummary | null>({ queryKey: ['expenses', 'summary', userId] });
    for (const [key, current] of entries) {
        const month = getMonthKeyFromQueryKey(key);
        if (!month) continue;
        queryClient.setQueryData<MonthlySummary | null>(key, updater(month, current ?? null));
    }
}

function findExpenseInCaches(queryClient: QueryClient, userId: string, expenseId: string): Expense | null {
    const monthCaches = queryClient.getQueriesData<Expense[]>({ queryKey: ['expenses', 'month', userId] });
    for (const [, current] of monthCaches) {
        if (!current) continue;
        const found = current.find((expense) => expense.id === expenseId);
        if (found) return toCachedExpense(found);
    }

    const recentCaches = queryClient.getQueriesData<Expense[]>({ queryKey: ['expenses', 'recent', userId] });
    for (const [, current] of recentCaches) {
        if (!current) continue;
        const found = current.find((expense) => expense.id === expenseId);
        if (found) return toCachedExpense(found);
    }

    return null;
}

function applyOptimisticAdd(queryClient: QueryClient, userId: string, optimisticExpense: Expense): void {
    updateRecentCaches(queryClient, userId, (current, limit) =>
        sortExpensesByDateDesc(
            [...current.filter((expense) => expense.id !== optimisticExpense.id), optimisticExpense]
        ).slice(0, limit)
    );

    updateMonthCaches(queryClient, userId, (month, current) => {
        if (month !== optimisticExpense.month) return current;
        return sortExpensesByDateDesc(
            [...current.filter((expense) => expense.id !== optimisticExpense.id), optimisticExpense]
        );
    });

    updateSummaryCaches(queryClient, userId, (month, current) => {
        if (month !== optimisticExpense.month) return current;
        return applySummaryTransition(current, null, optimisticExpense);
    });
}

function replaceExpenseIdInCaches(
    queryClient: QueryClient,
    userId: string,
    oldId: string | undefined,
    updatedExpense: Expense
): void {
    if (!oldId) return;

    updateRecentCaches(queryClient, userId, (current, limit) =>
        sortExpensesByDateDesc(
            current.map((expense) => (expense.id === oldId ? updatedExpense : expense))
        ).slice(0, limit)
    );

    updateMonthCaches(queryClient, userId, (_, current) =>
        sortExpensesByDateDesc(
            current.map((expense) => (expense.id === oldId ? updatedExpense : expense))
        )
    );
}

function applyOptimisticUpdate(
    queryClient: QueryClient,
    userId: string,
    previousExpense: Expense,
    nextExpense: Expense
): void {
    const oldMonth = previousExpense.month;
    const newMonth = nextExpense.month;

    updateRecentCaches(queryClient, userId, (current, limit) => {
        const hasExpense = current.some((expense) => expense.id === previousExpense.id);
        if (!hasExpense) return current;
        return sortExpensesByDateDesc(
            current.map((expense) => (expense.id === previousExpense.id ? nextExpense : expense))
        ).slice(0, limit);
    });

    updateMonthCaches(queryClient, userId, (month, current) => {
        if (month === oldMonth && month === newMonth) {
            return sortExpensesByDateDesc(
                current.map((expense) => (expense.id === previousExpense.id ? nextExpense : expense))
            );
        }
        if (month === oldMonth) {
            return current.filter((expense) => expense.id !== previousExpense.id);
        }
        if (month === newMonth) {
            return sortExpensesByDateDesc(
                [...current.filter((expense) => expense.id !== nextExpense.id), nextExpense]
            );
        }
        return current;
    });

    updateSummaryCaches(queryClient, userId, (month, current) => {
        if (month === oldMonth && month === newMonth) {
            return applySummaryTransition(current, previousExpense, nextExpense);
        }
        if (month === oldMonth) {
            return applySummaryTransition(current, previousExpense, null);
        }
        if (month === newMonth) {
            return applySummaryTransition(current, null, nextExpense);
        }
        return current;
    });
}

function applyOptimisticDelete(
    queryClient: QueryClient,
    userId: string,
    previousExpense: Expense | null,
    fallbackMonth: string
): void {
    updateRecentCaches(queryClient, userId, (current) =>
        previousExpense?.id
            ? current.filter((expense) => expense.id !== previousExpense.id)
            : current
    );

    updateMonthCaches(queryClient, userId, (month, current) => {
        const monthToUse = previousExpense?.month ?? fallbackMonth;
        if (month !== monthToUse) return current;
        if (!previousExpense?.id) return current;
        return current.filter((expense) => expense.id !== previousExpense.id);
    });

    if (previousExpense) {
        updateSummaryCaches(queryClient, userId, (month, current) => {
            if (month !== previousExpense.month) return current;
            return applySummaryTransition(current, previousExpense, null);
        });
    }
}

async function cancelExpenseCaches(queryClient: QueryClient, userId: string): Promise<void> {
    await Promise.all([
        queryClient.cancelQueries({ queryKey: ['expenses', 'recent', userId] }),
        queryClient.cancelQueries({ queryKey: ['expenses', 'month', userId] }),
        queryClient.cancelQueries({ queryKey: ['expenses', 'summary', userId] }),
    ]);
}

export function useRecentExpenses(userId: string | undefined, limit: number = 5) {
    return useQuery({
        queryKey: ['expenses', 'recent', userId, limit],
        queryFn: () => getRecentExpenses(userId!, limit),
        enabled: !!userId,
    });
}

export function useMonthlySummary(userId: string | undefined, month: string) {
    return useQuery({
        queryKey: ['expenses', 'summary', userId, month],
        queryFn: () => getMonthlySummary(userId!, month),
        enabled: !!userId,
    });
}

export function useMultipleMonthSummaries(userId: string | undefined, months: string[]) {
    return useQuery({
        queryKey: ['expenses', 'summaries', userId, months],
        queryFn: () => getMultipleMonthSummaries(userId!, months),
        enabled: !!userId && months.length > 0,
    });
}

export function useExpensesInRange(userId: string | undefined, startDate: Date, endDate: Date) {
    return useQuery({
        queryKey: ['expenses', 'range', userId, startDate.toISOString(), endDate.toISOString()],
        queryFn: () => getExpensesInRange(userId!, startDate, endDate),
        enabled: !!userId,
    });
}

export function useExpensesByMonth(userId: string | undefined, month: string) {
    return useQuery({
        queryKey: ['expenses', 'month', userId, month],
        queryFn: () => getExpensesByMonth(userId!, month),
        enabled: !!userId,
    });
}

export function useAddExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, data }: { userId: string; data: Omit<Expense, 'id'> }) => addExpense(userId, data),
        onMutate: async (variables): Promise<ExpenseMutationContext> => {
            await cancelExpenseCaches(queryClient, variables.userId);

            const snapshots = captureExpenseSnapshots(queryClient, variables.userId);
            const optimisticExpense = toCachedExpense({
                ...variables.data,
                id: `optimistic-${Date.now()}`,
            });

            applyOptimisticAdd(queryClient, variables.userId, optimisticExpense);

            return { snapshots, optimisticExpense };
        },
        onError: (_error, _variables, context) => {
            if (!context) return;
            restoreExpenseSnapshots(queryClient, context.snapshots);
        },
        onSuccess: (id, variables, context) => {
            if (!context?.optimisticExpense) return;
            const committedExpense = toCachedExpense({
                ...context.optimisticExpense,
                id,
            });
            replaceExpenseIdInCaches(
                queryClient,
                variables.userId,
                context.optimisticExpense.id,
                committedExpense
            );
        },
        onSettled: async (_data, _error, variables) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['expenses', 'range', variables.userId] }),
                queryClient.invalidateQueries({ queryKey: ['expenses', 'summaries', variables.userId] }),
            ]);
        },
    });
}

export function useUpdateExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, id, updates }: { userId: string; id: string; updates: Partial<Expense> }) => updateExpense(userId, id, updates),
        onMutate: async (variables): Promise<ExpenseMutationContext> => {
            await cancelExpenseCaches(queryClient, variables.userId);

            const snapshots = captureExpenseSnapshots(queryClient, variables.userId);
            const previousExpense = findExpenseInCaches(queryClient, variables.userId, variables.id);
            if (!previousExpense) {
                return { snapshots, previousExpense: null, nextExpense: null };
            }

            const nextExpense = toCachedExpense({
                ...previousExpense,
                ...variables.updates,
                id: variables.id,
            });

            applyOptimisticUpdate(queryClient, variables.userId, previousExpense, nextExpense);

            return { snapshots, previousExpense, nextExpense };
        },
        onError: (_error, _variables, context) => {
            if (!context) return;
            restoreExpenseSnapshots(queryClient, context.snapshots);
        },
        onSuccess: async (_data, variables, context) => {
            if (context?.previousExpense) return;
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['expenses', 'recent', variables.userId] }),
                queryClient.invalidateQueries({ queryKey: ['expenses', 'month', variables.userId] }),
                queryClient.invalidateQueries({ queryKey: ['expenses', 'summary', variables.userId] }),
            ]);
        },
        onSettled: async (_data, _error, variables) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['expenses', 'range', variables.userId] }),
                queryClient.invalidateQueries({ queryKey: ['expenses', 'summaries', variables.userId] }),
            ]);
        },
    });
}

export function useDeleteExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, id, month }: { userId: string; id: string; month: string }) => deleteExpense(userId, id, month),
        onMutate: async (variables): Promise<ExpenseMutationContext> => {
            await cancelExpenseCaches(queryClient, variables.userId);

            const snapshots = captureExpenseSnapshots(queryClient, variables.userId);
            const previousExpense = findExpenseInCaches(queryClient, variables.userId, variables.id);

            applyOptimisticDelete(queryClient, variables.userId, previousExpense, variables.month);

            return { snapshots, previousExpense };
        },
        onError: (_error, _variables, context) => {
            if (!context) return;
            restoreExpenseSnapshots(queryClient, context.snapshots);
        },
        onSuccess: async (_data, variables, context) => {
            if (context?.previousExpense) return;
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['expenses', 'recent', variables.userId] }),
                queryClient.invalidateQueries({ queryKey: ['expenses', 'month', variables.userId] }),
                queryClient.invalidateQueries({ queryKey: ['expenses', 'summary', variables.userId] }),
            ]);
        },
        onSettled: async (_data, _error, variables, context) => {
            const invalidations = [
                queryClient.invalidateQueries({ queryKey: ['expenses', 'range', variables.userId] }),
                queryClient.invalidateQueries({ queryKey: ['expenses', 'summaries', variables.userId] }),
            ];
            // If the deleted expense was a recurring occurrence, a skip marker was
            // created — nuke the upcoming bills cache so the dashboard can't show
            // stale data. removeQueries completely removes cached data.
            if (context?.previousExpense?.isRecurring) {
                queryClient.removeQueries({ queryKey: ['recurring', 'upcoming'] });
                invalidations.push(
                    queryClient.invalidateQueries({ queryKey: ['recurring'] }),
                );
            }
            await Promise.all(invalidations);
        },
    });
}
