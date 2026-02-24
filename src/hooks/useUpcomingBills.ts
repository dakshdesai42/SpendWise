import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getRecurringExpenses,
  getUpcomingRecurringBills,
  getUpcomingRecurringBillsForUser,
} from '../services/recurring';
import { BANK_SYNC_EVENT_NAME } from '../services/bankSync';
import { DEMO_RECURRING } from '../utils/demoData';
import { UpcomingBill } from '../types/models';

/**
 * Fetches upcoming recurring bills for the next 30 days.
 * Plain useState/useEffect — no React Query, no caching.
 * Fresh Firestore read on every mount and bank-sync event.
 */
export function useUpcomingBills(userId: string | undefined, demoMode = false) {
  const [bills, setBills] = useState<UpcomingBill[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const mountedRef = useRef(true);

  const fetchBills = useCallback(async () => {
    // Demo mode — no Firestore, just generate from sample data
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
      const active = rules.filter((r) => r.isActive !== false);

      if (active.length === 0) {
        if (mountedRef.current) {
          setBills([]);
          setLoading(false);
        }
        return;
      }

      const upcoming = await getUpcomingRecurringBillsForUser(userId, active, new Date(), 30);
      if (mountedRef.current) setBills(upcoming);
    } catch (err) {
      console.error('useUpcomingBills fetch error:', err);
      if (mountedRef.current) setBills([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId, demoMode]);

  // Fetch on mount / deps change
  useEffect(() => {
    mountedRef.current = true;
    fetchBills();
    return () => { mountedRef.current = false; };
  }, [fetchBills]);

  // Refetch when bank sync completes
  useEffect(() => {
    const handler = () => void fetchBills();
    window.addEventListener(BANK_SYNC_EVENT_NAME, handler);
    return () => window.removeEventListener(BANK_SYNC_EVENT_NAME, handler);
  }, [fetchBills]);

  return { bills, loading, refetch: fetchBills };
}
