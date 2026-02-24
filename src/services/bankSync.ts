import { collection, getDocs } from 'firebase/firestore';
import { getAuthInstance, getDb } from './firebase';
import type {
  BankConnection,
  BankLinkedAccount,
  BankSyncEventDetail,
  BankSyncResult,
  PlaidLinkSuccessMetadata,
} from '../types/bank';

const PLAID_SCRIPT_URL = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
const PLAID_SCRIPT_ID = 'spendwise-plaid-link-script';
export const BANK_SYNC_EVENT_NAME = 'spendwise-bank-sync';

function normalizeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === 'function') {
      const date = maybeTimestamp.toDate();
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
  }
  return null;
}

function toLinkedAccounts(value: unknown): BankLinkedAccount[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : '',
      name: typeof item.name === 'string' ? item.name : undefined,
      mask: typeof item.mask === 'string' ? item.mask : undefined,
      subtype: typeof item.subtype === 'string' ? item.subtype : undefined,
      type: typeof item.type === 'string' ? item.type : undefined,
    }))
    .filter((account) => !!account.id);
}

function parseBankConnection(id: string, raw: Record<string, unknown>): BankConnection {
  const accounts = toLinkedAccounts(raw.accounts);
  const institutionName = typeof raw.institutionName === 'string'
    ? raw.institutionName
    : typeof raw.institution_name === 'string'
      ? raw.institution_name
      : 'Linked account';
  const status = typeof raw.status === 'string' ? raw.status : 'active';

  return {
    id,
    provider: typeof raw.provider === 'string' ? raw.provider : 'plaid',
    institutionName,
    status,
    accountCount: accounts.length || (typeof raw.accountCount === 'number' ? raw.accountCount : 0),
    accounts,
    createdAt: normalizeTimestamp(raw.createdAt),
    updatedAt: normalizeTimestamp(raw.updatedAt),
    lastSyncedAt: normalizeTimestamp(raw.lastSyncedAt),
  };
}

function sortConnectionsNewestFirst(a: BankConnection, b: BankConnection): number {
  const aTime = a.lastSyncedAt || a.updatedAt || a.createdAt || '';
  const bTime = b.lastSyncedAt || b.updatedAt || b.createdAt || '';
  return bTime.localeCompare(aTime);
}

function parseCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return 0;
}

function getBankApiBaseUrl(): string {
  const value = (import.meta.env.VITE_BANK_API_BASE_URL as string | undefined)?.trim();
  if (!value) {
    throw new Error('Bank API is not configured. Set VITE_BANK_API_BASE_URL in your .env file.');
  }
  return value.replace(/\/+$/, '');
}

export function hasBankApiConfigured(): boolean {
  return !!(import.meta.env.VITE_BANK_API_BASE_URL as string | undefined)?.trim();
}

export function dispatchBankSyncEvent(detail: BankSyncEventDetail): void {
  window.dispatchEvent(new CustomEvent<BankSyncEventDetail>(BANK_SYNC_EVENT_NAME, { detail }));
}

async function getUserToken(userId: string): Promise<string> {
  const currentUser = getAuthInstance().currentUser;
  if (!currentUser) throw new Error('Please sign in again before linking a bank account.');
  if (currentUser.uid !== userId) throw new Error('User mismatch while linking bank account.');
  return currentUser.getIdToken();
}

function parseApiError(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null) {
    const typed = payload as { error?: unknown; message?: unknown };
    if (typeof typed.error === 'string' && typed.error.trim()) return typed.error;
    if (typeof typed.message === 'string' && typed.message.trim()) return typed.message;
  }
  return fallback;
}

async function postBankApi<TResponse>(userId: string, path: string, body: Record<string, unknown> = {}): Promise<TResponse> {
  const token = await getUserToken(userId);
  const response = await fetch(`${getBankApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, ...body }),
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(parseApiError(payload, `Bank API request failed (${response.status})`));
  }
  return payload as TResponse;
}

let plaidScriptPromise: Promise<void> | null = null;

function ensurePlaidScriptLoaded(): Promise<void> {
  if (window.Plaid) return Promise.resolve();
  if (plaidScriptPromise) return plaidScriptPromise;

  plaidScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(PLAID_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Plaid Link script.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = PLAID_SCRIPT_ID;
    script.src = PLAID_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Plaid Link script.'));
    document.head.appendChild(script);
  });

  return plaidScriptPromise;
}

type CreateLinkTokenResponse = {
  linkToken?: string;
  link_token?: string;
};

type ExchangePublicTokenResponse = {
  connectionId?: string;
  institutionName?: string;
};

type SyncTransactionsResponse = {
  importedCount?: number;
  imported_count?: number;
  skippedCount?: number;
  skipped_count?: number;
  errorCount?: number;
  error_count?: number;
  lastSyncAt?: string | null;
  last_sync_at?: string | null;
};

export async function getBankConnections(userId: string): Promise<BankConnection[]> {
  const snapshot = await getDocs(collection(getDb(), 'users', userId, 'bankConnections'));
  return snapshot.docs
    .map((docSnap) => parseBankConnection(docSnap.id, docSnap.data() as Record<string, unknown>))
    .sort(sortConnectionsNewestFirst);
}

export async function createBankLinkToken(userId: string): Promise<string> {
  const response = await postBankApi<CreateLinkTokenResponse>(userId, '/plaid/create-link-token');
  const linkToken = response.linkToken || response.link_token;
  if (!linkToken) {
    throw new Error('Bank API did not return a Plaid link token.');
  }
  return linkToken;
}

export async function exchangePlaidPublicToken(
  userId: string,
  publicToken: string,
  metadata: PlaidLinkSuccessMetadata
): Promise<ExchangePublicTokenResponse> {
  return postBankApi<ExchangePublicTokenResponse>(userId, '/plaid/exchange-public-token', {
    publicToken,
    metadata,
  });
}

export async function syncBankTransactions(
  userId: string,
  connectionId?: string
): Promise<BankSyncResult> {
  const response = await postBankApi<SyncTransactionsResponse>(userId, '/plaid/sync-transactions', {
    connectionId: connectionId || null,
  });
  return {
    importedCount: parseCount(response.importedCount ?? response.imported_count),
    skippedCount: parseCount(response.skippedCount ?? response.skipped_count),
    errorCount: parseCount(response.errorCount ?? response.error_count),
    lastSyncAt: response.lastSyncAt ?? response.last_sync_at ?? null,
  };
}

export async function disconnectBankConnection(userId: string, connectionId: string): Promise<void> {
  await postBankApi(userId, '/plaid/disconnect', { connectionId });
}

export async function linkBankAccountWithPlaid(userId: string): Promise<ExchangePublicTokenResponse> {
  const linkToken = await createBankLinkToken(userId);
  await ensurePlaidScriptLoaded();
  if (!window.Plaid) {
    throw new Error('Plaid script loaded but Plaid Link is unavailable.');
  }

  return new Promise<ExchangePublicTokenResponse>((resolve, reject) => {
    let settled = false;
    const handler = window.Plaid!.create({
      token: linkToken,
      onSuccess: async (publicToken, metadata) => {
        try {
          const result = await exchangePlaidPublicToken(userId, publicToken, metadata);
          settled = true;
          resolve(result);
        } catch (error) {
          settled = true;
          reject(error instanceof Error ? error : new Error('Failed to link bank account.'));
        } finally {
          handler.destroy();
        }
      },
      onExit: (error) => {
        if (settled) return;
        handler.destroy();
        if (error?.error_message) {
          reject(new Error(error.error_message));
          return;
        }
        reject(new Error('Bank linking was canceled.'));
      },
    });

    handler.open();
  });
}
