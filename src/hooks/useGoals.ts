import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGoals, addGoal, deleteGoal, applyUnderspendToGoals } from '../services/goals';
import { Goal } from '../types/models';

export function useGoals(userId: string | undefined) {
    return useQuery({
        queryKey: ['goals', userId],
        queryFn: () => getGoals(userId!),
        enabled: !!userId,
    });
}

export function useAddGoal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, goalData }: { userId: string; goalData: Omit<Goal, 'id'> }) => addGoal(userId, goalData),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['goals', variables.userId] });
        },
    });
}

export function useDeleteGoal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, goalId }: { userId: string; goalId: string }) => deleteGoal(userId, goalId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['goals', variables.userId] });
        },
    });
}

export function useApplyUnderspendToGoals() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, amount }: { userId: string; amount: number }) => applyUnderspendToGoals(userId, amount),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['goals', variables.userId] });
        },
    });
}
