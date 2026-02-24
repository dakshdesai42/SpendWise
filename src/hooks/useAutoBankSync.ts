import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  dispatchBankSyncEvent,
  getBankConnections,
  hasBankApiConfigured,
  syncBankTransactions,
} from '../services/bankSync';
import type { BankSyncEventDetail, BankSyncResult } from '../types/bank';

const AUTO_BANK_SYNC_INTERVAL_MS = 15 * 60 * 1000;
const AUTO_SYNC_STORAGE_PREFIX = 'spendwise:auto-bank-sync:';

type BankSyncSource = NonNullable<BankSyncEventDetail['source']>;

type TriggerSyncOptions = {
  force?: boolean;
  source?: BankSyncSource;
};

function getStorageKey(userId: string): string {
  return `${AUTO_SYNC_STORAGE_PREFIX}${userId}`;
}

function getLastAutoSyncMs(userId: string): number {
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function setLastAutoSyncMs(userId: string, value: number): void {
  try {
    const storageKey = getStorageKey(userId);
    if (value > 0) {
      window.localStorage.setItem(storageKey, String(value));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // Ignore storage failures (private mode / storage disabled).
  }
}

async function invalidateQueriesForBankSync(queryClient: ReturnType<typeof useQueryClient>, userId: string): Promise<void> {
  await Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: ['expenses'] }),
    queryClient.invalidateQueries({ queryKey: ['budgets', userId] }),
    queryClient.invalidateQueries({ queryKey: ['recurring', userId] }),
  ]);
}

function hasActiveConnectionStatuses(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized !== 'disconnected' && normalized !== 'inactive';
}

export function useAutoBankSync(userId: string | undefined, demoMode: boolean) {
  const queryClient = useQueryClient();
  const syncingRef = useRef(false);

  const triggerBankSync = useCallback(
    async (options: TriggerSyncOptions = {}): Promise<BankSyncResult | null> => {
      if (!userId || demoMode || !hasBankApiConfigured()) return null;
      if (syncingRef.current) return null;

      const now = Date.now();
      const source = options.source ?? 'auto';
      if (!options.force) {
        const lastAutoSyncMs = getLastAutoSyncMs(userId);
        if (lastAutoSyncMs > 0 && now - lastAutoSyncMs < AUTO_BANK_SYNC_INTERVAL_MS) {
          return null;
        }
      }

      syncingRef.current = true;
      setLastAutoSyncMs(userId, now);

      try {
        const connections = await getBankConnections(userId);
        const hasActiveConnections = connections.some((connection) =>
          hasActiveConnectionStatuses(connection.status)
        );
        if (!hasActiveConnections) return null;

        const result = await syncBankTransactions(userId);
        await invalidateQueriesForBankSync(queryClient, userId);
        dispatchBankSyncEvent({ ...result, source });
        return result;
      } catch (error) {
        setLastAutoSyncMs(userId, 0);
        console.warn('Bank sync failed:', error);
        return null;
      } finally {
        syncingRef.current = false;
      }
    },
    [demoMode, queryClient, userId]
  );

  useEffect(() => {
    void triggerBankSync({ source: 'auto' });
  }, [triggerBankSync]);

  useEffect(() => {
    if (!userId || demoMode || !hasBankApiConfigured()) return;

    const onFocus = () => {
      void triggerBankSync({ source: 'background' });
    };

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      void triggerBankSync({ source: 'background' });
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [demoMode, triggerBankSync, userId]);

  return {
    triggerBankSync,
  };
}
