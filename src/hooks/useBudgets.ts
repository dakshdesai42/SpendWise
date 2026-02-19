import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBudget, setBudget } from '../services/budgets';

export function useBudget(userId: string | undefined, month: string) {
    return useQuery({
        queryKey: ['budgets', userId, month],
        queryFn: () => getBudget(userId!, month),
        enabled: !!userId,
    });
}

export function useSetBudget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, month, overall, categories, currency }: { userId: string; month: string; overall: number; categories: Record<string, number>; currency: string; }) =>
            setBudget(userId, month, overall, categories, currency),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['budgets', variables.userId, variables.month] });
        },
    });
}
