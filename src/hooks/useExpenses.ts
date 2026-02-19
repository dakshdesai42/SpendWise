import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Expense } from '../types/models';

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
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['expenses', 'recent', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'summary', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'month', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'range', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'summaries', variables.userId] });
        },
    });
}

export function useUpdateExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, id, updates }: { userId: string; id: string; updates: Partial<Expense> }) => updateExpense(userId, id, updates),
        onSuccess: (_, variables) => {
            // Invalidate everything related to expenses
            queryClient.invalidateQueries({ queryKey: ['expenses', 'recent', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'summary', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'month', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'range', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'summaries', variables.userId] });
        },
    });
}

export function useDeleteExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, id, month }: { userId: string; id: string; month: string }) => deleteExpense(userId, id, month),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['expenses', 'recent', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'summary', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'month', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'range', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'summaries', variables.userId] });
        },
    });
}
