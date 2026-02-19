import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getRecurringExpenses,
    addRecurringExpense,
    deleteRecurringExpense,
    toggleRecurringExpense,
    autoPostRecurringForMonth
} from '../services/recurring';
import { RecurringBill } from '../types/models';

export function useRecurringExpenses(userId: string | undefined) {
    return useQuery({
        queryKey: ['recurring', userId],
        queryFn: () => getRecurringExpenses(userId!),
        enabled: !!userId,
    });
}

export function useAutoPostRecurringForMonth() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, month }: { userId: string; month: string }) => autoPostRecurringForMonth(userId, month),
        onSuccess: (_, variables) => {
            // It posts expenses, so invalidate expenses
            queryClient.invalidateQueries({ queryKey: ['expenses', 'month', variables.userId, variables.month] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'summary', variables.userId, variables.month] });
            queryClient.invalidateQueries({ queryKey: ['expenses', 'recent', variables.userId] });
        },
    });
}

export function useAddRecurringExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, data }: { userId: string; data: Omit<RecurringBill, 'id'> }) => addRecurringExpense(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['recurring', variables.userId] });
        },
    });
}

export function useToggleRecurringExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, id, isActive }: { userId: string; id: string; isActive: boolean }) => toggleRecurringExpense(userId, id, isActive),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['recurring', variables.userId] });
        },
    });
}

export function useDeleteRecurringExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, id }: { userId: string; id: string }) => deleteRecurringExpense(userId, id),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['recurring', variables.userId] });
        },
    });
}
