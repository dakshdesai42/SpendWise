export interface Expense {
    id?: string;
    amount: number;
    category: string;
    date: string | Date;
    note?: string;
    type?: 'expense' | 'income';
    receiptUrl?: string;
    isRecurring?: boolean;
    frequency?: string | null;
    recurringId?: string | null;
    recurringOccurrenceKey?: string | null;
    fingerprint?: string | null;
    amountHome?: number;
    exchangeRate?: number;
    month?: string;
}

export interface Goal {
    id?: string;
    title: string;
    targetAmount: number;
    currentSaved?: number;
    targetDate?: string | Date | null;
    isActive?: boolean;
}

export interface Budget {
    id?: string;
    month?: string;
    overall: number;
    categories?: Record<string, number>;
    currency?: string;
}

export interface UserProfile {
    id?: string;
    uid: string;
    email: string | null;
    displayName?: string | null;
    currentStreak?: number;
    lastLogin?: string;
    longestStreak?: number;
    homeCurrency?: string;
    hostCurrency?: string;
    achievements?: string[];
}

export interface RecurringBill {
    id?: string;
    amount: number;
    category: string;
    note?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    dueDate?: string | Date;
    isActive?: boolean;
    startDate?: string | Date;
    amountHome?: number;
    exchangeRate?: number;
}

export interface MonthlySummary {
    categoryTotals: Record<string, number>;
    totalSpent: number;
    totalSpentHome?: number;
    transactionCount: number;
}

export type ExchangeRates = Record<string, number>;

export interface ParsedTransaction {
    date: string;
    amount: number;
    note: string;
    category: string;
    fingerprint: string;
    isDuplicate?: boolean;
}

export interface TrendDataPoint {
    month: string;
    total: number;
}

export interface UpcomingBill {
    recurringId: string | undefined;
    dueDate: Date;
    amount: number;
    category: string;
    note?: string;
    frequency: string;
}

export interface WeeklyReview {
    total: number;
    count: number;
    change: number;
    topCategory: { icon: string; label: string; color: string };
    biggest: Expense | undefined;
    action: string;
}

export interface ProcessingFile {
    name: string;
    status: 'pending' | 'done' | 'error';
    count: number;
}
