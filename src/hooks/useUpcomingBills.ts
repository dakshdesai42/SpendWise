import { useState, useEffect, useCallback } from 'react';
import {
    getRecurringExpenses,
    getUpcomingRecurringBills,
    getUpcomingRecurringBillsForUser,
} from '../services/recurring';
import { DEMO_RECURRING } from '../utils/demoData';
import { UpcomingBill } from '../types/models';

/**
 * Standalone hook for upcoming bills. Uses plain useState/useEffect —
 * NO React Query, NO caching. Every time the component mounts, it
 * fetches fresh data directly from Firestore. This guarantees that
 * deleted recurring rules never show up as stale cached data.
 */
export function useUpcomingBills(userId: string | undefined, demoMode: boolean = false) {
    const [bills, setBills] = useState<UpcomingBill[]>([]);
    const [loading, setLoading] = useState(!demoMode);

    const fetchBills = useCallback(async () => {
        if (demoMode) {
            setBills(getUpcomingRecurringBills(DEMO_RECURRING, new Date(), 30));
            setLoading(false);
            return;
        }
        if (!userId) {
            setBills([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const rules = await getRecurringExpenses(userId);
            const upcoming = await getUpcomingRecurringBillsForUser(userId, rules, new Date(), 30);
            setBills(upcoming);
        } catch (err) {
            console.error('Failed to fetch upcoming bills:', err);
            setBills([]);
        } finally {
            setLoading(false);
        }
    }, [userId, demoMode]);

    useEffect(() => {
        fetchBills();
    }, [fetchBills]);

    return { bills, loading, refetch: fetchBills };
}
