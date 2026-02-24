import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDocsFromServer,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  addDays,
  addWeeks,
  endOfMonth,
  isAfter,
  startOfMonth,
} from 'date-fns';
import { getDb } from './firebase';
import {
  createRecurringOccurrenceIfMissing,
  deleteFutureRecurringOccurrences,
  deleteRecurringSkipsByRecurringId,
  getExpensesByMonth,
  getRecurringSkipKeysForMonth,
  updateMonthlySummary,
} from './expenses';
import { Expense, RecurringBill, UpcomingBill } from '../types/models';
import { endOfDayLocal, formatDayKey, parseLocalDate, parseMonthKey, startOfDayLocal } from '../utils/date';

function recurringRef(userId: string) {
  return collection(getDb(), 'users', userId, 'recurringExpenses');
}

export const RECURRING_RULES_CHANGED_EVENT_NAME = 'spendwise-recurring-rules-changed';

function emitRecurringRulesChanged(): void {
  window.dispatchEvent(new CustomEvent(RECURRING_RULES_CHANGED_EVENT_NAME));
}

type RecurringQueryOptions = {
  serverOnly?: boolean;
};

export async function getRecurringExpenses(userId: string, options: RecurringQueryOptions = {}): Promise<RecurringBill[]> {
  const q = query(recurringRef(userId), orderBy('createdAt', 'desc'));
  const { serverOnly = false } = options;
  let snapshot;
  if (serverOnly) {
    snapshot = await getDocsFromServer(q);
  } else {
    // Prefer server to avoid stale IndexedDB cache, but allow fallback for offline UX.
    try {
      snapshot = await getDocsFromServer(q);
    } catch {
      snapshot = await getDocs(q);
    }
  }
  return snapshot.docs.map((d) => ({
    ...d.data() as RecurringBill,
    id: d.id,
  }));
}

export async function addRecurringExpense(userId: string, data: Omit<RecurringBill, 'id'>): Promise<string> {
  const docRef = await addDoc(recurringRef(userId), {
    amount: data.amount,
    amountHome: data.amountHome,
    exchangeRate: data.exchangeRate,
    category: data.category,
    note: data.note || '',
    frequency: data.frequency,
    startDate: data.startDate,
    isActive: true,
    createdAt: serverTimestamp(),
  });
  emitRecurringRulesChanged();
  return docRef.id;
}

export async function updateRecurringExpense(userId: string, id: string, updates: Partial<RecurringBill>): Promise<void> {
  await updateDoc(doc(getDb(), 'users', userId, 'recurringExpenses', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  emitRecurringRulesChanged();
}

export async function deleteRecurringExpense(
  userId: string,
  id: string,
  options: { deleteFutureOccurrences?: boolean; fromDate?: string | Date } = {}
): Promise<{ deletedFutureOccurrences: number; cleanupWarning: boolean }> {
  let deletedFutureOccurrences = 0;
  let cleanupWarning = false;
  if (options.deleteFutureOccurrences !== false) {
    try {
      deletedFutureOccurrences = await deleteFutureRecurringOccurrences(userId, id, options.fromDate ?? new Date());
    } catch (error) {
      // Don't block rule deletion if cleanup has a transient failure.
      cleanupWarning = true;
      console.warn('Failed to delete future recurring occurrences:', error);
    }
  }
  await deleteDoc(doc(getDb(), 'users', userId, 'recurringExpenses', id));
  try {
    await deleteRecurringSkipsByRecurringId(userId, id);
  } catch (error) {
    cleanupWarning = true;
    console.warn('Failed to cleanup recurring skip markers:', error);
  }
  emitRecurringRulesChanged();
  return { deletedFutureOccurrences, cleanupWarning };
}

export async function toggleRecurringExpense(userId: string, id: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(getDb(), 'users', userId, 'recurringExpenses', id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
  emitRecurringRulesChanged();
}

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

function normalizeFrequency(value: string | undefined | null): Frequency {
  if (value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly') {
    return value;
  }
  return 'monthly';
}

function isRecurringRuleActive(isActive: unknown): boolean {
  if (isActive === false) return false;
  if (isActive === null) return false;
  if (typeof isActive === 'string') {
    const normalized = isActive.trim().toLowerCase();
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  if (typeof isActive === 'number' && isActive === 0) return false;
  return true;
}

async function cleanupDuplicateRecurringInMonth(userId: string, month: string, expenses: Expense[]): Promise<{ cleanedExpenses: Expense[]; removed: number }> {
  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    if (!expense.isRecurring || !expense.id) continue;
    const key = expense.recurringOccurrenceKey || (expense.recurringId ? `${expense.recurringId}:${formatDayKey(expense.date)}` : '');
    if (!key) continue;
    const group = groups.get(key) || [];
    group.push(expense);
    groups.set(key, group);
  }

  const duplicateIds: string[] = [];
  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    group.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    for (const duplicate of group.slice(1)) {
      if (duplicate.id) duplicateIds.push(duplicate.id);
    }
  }

  if (duplicateIds.length === 0) {
    return { cleanedExpenses: expenses, removed: 0 };
  }

  for (const expenseId of duplicateIds) {
    await deleteDoc(doc(getDb(), 'users', userId, 'expenses', expenseId));
  }
  await updateMonthlySummary(userId, month);

  const removedSet = new Set(duplicateIds);
  return {
    cleanedExpenses: expenses.filter((expense) => !expense.id || !removedSet.has(expense.id)),
    removed: duplicateIds.length,
  };
}

// ---------------------------------------------------------------------------
// Simple date helpers for recurring occurrence generation
// ---------------------------------------------------------------------------

/** Safely convert any date-like value (Date, string, Firestore Timestamp) to a Date. */
function toSafeDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && 'toDate' in value) {
    try { return (value as { toDate: () => Date }).toDate(); } catch { return null; }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = parseLocalDate(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Advance a date by one frequency step, keeping the original day-of-month anchored. */
function addMonthsAnchored(date: Date, months: number, anchorDay: number): Date {
  const next = new Date(date);
  const hours = next.getHours();
  const minutes = next.getMinutes();
  const seconds = next.getSeconds();
  const milliseconds = next.getMilliseconds();

  next.setDate(1); // Prevent rollover when moving month from a 29/30/31 day date.
  next.setMonth(next.getMonth() + months);
  const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(anchorDay, maxDay));
  next.setHours(hours, minutes, seconds, milliseconds);
  return next;
}

function addYearsAnchored(date: Date, years: number, anchorDay: number): Date {
  const next = new Date(date);
  const hours = next.getHours();
  const minutes = next.getMinutes();
  const seconds = next.getSeconds();
  const milliseconds = next.getMilliseconds();

  next.setDate(1); // Prevent leap-year rollover surprises.
  next.setFullYear(next.getFullYear() + years);
  const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(anchorDay, maxDay));
  next.setHours(hours, minutes, seconds, milliseconds);
  return next;
}

function stepOnce(date: Date, frequency: Frequency, anchorDay: number): Date {
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'yearly':
      return addYearsAnchored(date, 1, anchorDay);
    default:
      return addMonthsAnchored(date, 1, anchorDay);
  }
}

/** Jump cursor forward close to rangeStart without overshooting, then walk the rest. */
function jumpNear(first: Date, rangeStart: Date, frequency: Frequency, anchorDay: number): Date {
  let cursor = new Date(first);
  if (cursor >= rangeStart) return cursor;

  if (frequency === 'daily') {
    const daysBetween = Math.floor((rangeStart.getTime() - cursor.getTime()) / 86_400_000);
    cursor = addDays(cursor, Math.max(daysBetween - 1, 0));
  } else if (frequency === 'weekly') {
    const weeksBetween = Math.floor((rangeStart.getTime() - cursor.getTime()) / (7 * 86_400_000));
    cursor = addWeeks(cursor, Math.max(weeksBetween - 1, 0));
  } else if (frequency === 'monthly') {
    const monthsBetween = (rangeStart.getFullYear() - cursor.getFullYear()) * 12
      + (rangeStart.getMonth() - cursor.getMonth());
    if (monthsBetween > 1) {
      cursor = addMonthsAnchored(cursor, monthsBetween - 1, anchorDay);
    }
  } else { // yearly
    const yearsBetween = rangeStart.getFullYear() - cursor.getFullYear();
    if (yearsBetween > 1) {
      cursor = addYearsAnchored(cursor, yearsBetween - 1, anchorDay);
    }
  }

  // Walk forward until we reach or pass rangeStart (max 60 steps as safety)
  for (let i = 0; i < 60 && cursor < rangeStart; i++) {
    cursor = stepOnce(cursor, frequency, anchorDay);
  }
  return cursor;
}

function getOccurrencesInMonth(recurringExpense: RecurringBill, month: string): Date[] {
  const start = startOfMonth(parseMonthKey(month));
  const end = endOfMonth(start);
  const first = toSafeDate(recurringExpense.startDate);
  if (!first || first > end) return [];
  const frequency = normalizeFrequency(recurringExpense.frequency);
  const anchorDay = first.getDate();

  let cursor = jumpNear(first, start, frequency, anchorDay);
  const occurrences: Date[] = [];
  for (let i = 0; i < 100 && cursor <= end; i++) {
    if (cursor >= start) occurrences.push(new Date(cursor));
    cursor = stepOnce(cursor, frequency, anchorDay);
  }
  return occurrences;
}

export async function autoPostRecurringForMonth(userId: string, month: string, options: { cutoffDate?: string | Date } = {}): Promise<{ created: number; cleaned: number }> {
  const cutoffDate = options.cutoffDate ? endOfDayLocal(options.cutoffDate) : endOfDayLocal(new Date());
  const recurring = await getRecurringExpenses(userId);
  const activeRecurring = recurring.filter((r) => isRecurringRuleActive(r.isActive));
  if (activeRecurring.length === 0) return { created: 0, cleaned: 0 };

  const monthExpenses = await getExpensesByMonth(userId, month);
  const { cleanedExpenses, removed } = await cleanupDuplicateRecurringInMonth(userId, month, monthExpenses);
  const skippedKeys = await getRecurringSkipKeysForMonth(userId, month);

  const existingKeys = new Set(
    cleanedExpenses
      .filter((e) => e.recurringOccurrenceKey)
      .map((e) => e.recurringOccurrenceKey)
  );
  const existingRecurringByIdDay = new Set(
    cleanedExpenses
      .filter((e) => e.isRecurring && e.recurringId)
      .map((e) => `${e.recurringId}:${formatDayKey(e.date)}`)
  );

  let created = 0;
  for (const rec of activeRecurring) {
    if (!rec.id) continue;
    const occurrences = getOccurrencesInMonth(rec, month)
      .filter((d) => !isAfter(d, cutoffDate));

    for (const occ of occurrences) {
      const dayKey = formatDayKey(occ);
      const key = `${rec.id}:${dayKey}`;
      const recurringDayKey = `${rec.id}:${dayKey}`;
      if (skippedKeys.has(key)) continue;
      if (existingKeys.has(key) || existingRecurringByIdDay.has(recurringDayKey)) continue;

      const occurrenceDocId = `rec_${rec.id}_${formatDayKey(occ)}`;
      const inserted = await createRecurringOccurrenceIfMissing(
        userId,
        occurrenceDocId,
        {
          amount: rec.amount,
          amountHome: rec.amountHome,
          exchangeRate: rec.exchangeRate,
          category: rec.category,
          note: rec.note,
          date: occ,
          isRecurring: true,
          frequency: rec.frequency,
          recurringId: rec.id,
          recurringOccurrenceKey: key,
        }
      );
      if (!inserted) continue;
      existingKeys.add(key);
      existingRecurringByIdDay.add(recurringDayKey);
      created += 1;
    }
  }

  if (created > 0) {
    await updateMonthlySummary(userId, month);
  }
  return { created, cleaned: removed };
}

/**
 * Re-enable all recurring rules that may have been wrongly deactivated.
 * Should be called once to repair data, guarded by a localStorage flag.
 */
export async function reactivateAllRecurringRules(userId: string): Promise<number> {
  const recurring = await getRecurringExpenses(userId);
  let reactivated = 0;
  for (const rule of recurring) {
    if (!rule.id) continue;
    if (rule.isActive === false) {
      await updateDoc(doc(getDb(), 'users', userId, 'recurringExpenses', rule.id), {
        isActive: true,
        updatedAt: serverTimestamp(),
      });
      reactivated++;
    }
  }
  return reactivated;
}

/**
 * Generate upcoming bill occurrences for a list of recurring rules.
 * Pure function — no Firestore calls. Works for both demo and real data.
 */
export function getUpcomingRecurringBills(
  recurring: RecurringBill[],
  fromDate: Date | string = new Date(),
  days = 30
): UpcomingBill[] {
  const start = startOfDayLocal(fromDate);
  const end = addDays(start, days);
  const upcoming: UpcomingBill[] = [];

  for (const rec of recurring) {
    if (!isRecurringRuleActive(rec.isActive)) continue;
    if (!Number.isFinite(rec.amount) || rec.amount <= 0) continue;

    const first = toSafeDate(rec.startDate);
    if (!first) continue;

    const frequency = normalizeFrequency(rec.frequency);
    const anchorDay = first.getDate();
    let cursor = jumpNear(first, start, frequency, anchorDay);

    // Collect occurrences within [start, end]. Max 60 as safety.
    for (let i = 0; i < 60 && cursor <= end; i++) {
      if (cursor >= start) {
        upcoming.push({
          recurringId: rec.id,
          dueDate: new Date(cursor),
          amount: rec.amount,
          category: rec.category,
          note: rec.note,
          frequency: rec.frequency,
        });
      }
      cursor = stepOnce(cursor, frequency, anchorDay);
    }
  }

  return upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

/**
 * Like getUpcomingRecurringBills, but also filters out skipped occurrences
 * for a real user. Makes one Firestore call per month in the range.
 */
export async function getUpcomingRecurringBillsForUser(
  userId: string,
  recurring: RecurringBill[],
  fromDate: Date | string = new Date(),
  days = 30
): Promise<UpcomingBill[]> {
  const upcoming = getUpcomingRecurringBills(recurring, fromDate, days);
  if (upcoming.length === 0) return upcoming;

  // Collect the unique months covered by the upcoming bills
  const months = new Set<string>();
  for (const bill of upcoming) {
    months.add(formatDayKey(bill.dueDate).slice(0, 7));
  }

  // Load skip keys for those months (swallow errors per month)
  const allSkipped = new Set<string>();
  for (const month of months) {
    try {
      const keys = await getRecurringSkipKeysForMonth(userId, month, { serverOnly: true });
      for (const k of keys) allSkipped.add(k);
    } catch { /* ignore — treat as no skips */ }
  }

  if (allSkipped.size === 0) return upcoming;

  return upcoming.filter((bill) => {
    if (!bill.recurringId) return true;
    return !allSkipped.has(`${bill.recurringId}:${formatDayKey(bill.dueDate)}`);
  });
}
