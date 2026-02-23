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
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  endOfMonth,
  isAfter,
  isBefore,
  isSameDay,
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

export async function getRecurringExpenses(userId: string): Promise<RecurringBill[]> {
  const q = query(recurringRef(userId), orderBy('createdAt', 'desc'));
  // Always read from server — Firestore's IndexedDB cache can serve stale
  // data (deleted rules still present), especially on Capacitor iOS.
  // Fall back to default getDocs if offline.
  let snapshot;
  try {
    snapshot = await getDocsFromServer(q);
  } catch {
    snapshot = await getDocs(q);
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
  return docRef.id;
}

export async function updateRecurringExpense(userId: string, id: string, updates: Partial<RecurringBill>): Promise<void> {
  await updateDoc(doc(getDb(), 'users', userId, 'recurringExpenses', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
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
  return { deletedFutureOccurrences, cleanupWarning };
}

export async function toggleRecurringExpense(userId: string, id: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(getDb(), 'users', userId, 'recurringExpenses', id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
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

function addMonthsAnchored(date: Date, months: number, anchorDay: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const monthLastDay = endOfMonth(next).getDate();
  next.setDate(Math.min(anchorDay, monthLastDay));
  return next;
}

function addYearsAnchored(date: Date, years: number, anchorMonth: number, anchorDay: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setFullYear(next.getFullYear() + years, anchorMonth, 1);
  const monthLastDay = endOfMonth(next).getDate();
  next.setDate(Math.min(anchorDay, monthLastDay));
  return next;
}

function stepDate(date: Date, frequency: Frequency, anchorDay: number, anchorMonth: number): Date {
  if (frequency === 'daily') return addDays(date, 1);
  if (frequency === 'weekly') return addWeeks(date, 1);
  if (frequency === 'yearly') return addYearsAnchored(date, 1, anchorMonth, anchorDay);
  return addMonthsAnchored(date, 1, anchorDay);
}

function alignCursorToRangeStart(first: Date, start: Date, frequency: Frequency, anchorDay: number, anchorMonth: number): Date {
  let cursor = new Date(first);
  if (!isBefore(cursor, start)) return cursor;

  if (frequency === 'daily') {
    const jump = differenceInCalendarDays(start, cursor);
    cursor = addDays(cursor, Math.max(jump, 0));
    return cursor;
  }

  if (frequency === 'weekly') {
    const jumpWeeks = Math.floor(differenceInCalendarDays(start, cursor) / 7);
    cursor = addWeeks(cursor, Math.max(jumpWeeks, 0));
    while (isBefore(cursor, start)) cursor = addWeeks(cursor, 1);
    return cursor;
  }

  if (frequency === 'monthly') {
    const jumpMonths = differenceInCalendarMonths(start, cursor);
    if (jumpMonths > 0) cursor = addMonthsAnchored(cursor, jumpMonths, anchorDay);
    while (isBefore(cursor, start)) cursor = addMonthsAnchored(cursor, 1, anchorDay);
    return cursor;
  }

  const jumpYears = differenceInCalendarYears(start, cursor);
  if (jumpYears > 0) cursor = addYearsAnchored(cursor, jumpYears, anchorMonth, anchorDay);
  while (isBefore(cursor, start)) cursor = addYearsAnchored(cursor, 1, anchorMonth, anchorDay);
  return cursor;
}

function getOccurrencesInMonth(recurringExpense: RecurringBill, month: string): Date[] {
  const start = startOfMonth(parseMonthKey(month));
  const end = endOfMonth(start);
  if (!recurringExpense.startDate) return [];
  const first = parseLocalDate(recurringExpense.startDate);
  if (isAfter(first, end)) return [];
  const frequency = normalizeFrequency(recurringExpense.frequency);
  const anchorDay = first.getDate();
  const anchorMonth = first.getMonth();

  let cursor = alignCursorToRangeStart(first, start, frequency, anchorDay, anchorMonth);
  const occurrences: Date[] = [];
  for (let i = 0; i < 2500; i++) {
    if (isAfter(cursor, end)) break;
    if (!isBefore(cursor, start) || isSameDay(cursor, start)) {
      occurrences.push(new Date(cursor));
    }
    cursor = stepDate(cursor, frequency, anchorDay, anchorMonth);
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
      const key = `${rec.id}:${formatDayKey(occ)}`;
      const recurringDayKey = `${rec.id}:${formatDayKey(occ)}`;
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

export function getUpcomingRecurringBills(recurring: RecurringBill[], fromDate: Date | string = new Date(), days = 30): UpcomingBill[] {
  const start = startOfDayLocal(fromDate);
  const end = addDays(start, days);
  const upcoming: UpcomingBill[] = [];

  for (const rec of recurring.filter((r) => isRecurringRuleActive(r.isActive))) {
    if (!Number.isFinite(rec.amount) || rec.amount <= 0) continue;
    if (!rec.startDate) continue;
    const first = parseLocalDate(rec.startDate);
    const frequency = normalizeFrequency(rec.frequency);
    const anchorDay = first.getDate();
    const anchorMonth = first.getMonth();
    let cursor = alignCursorToRangeStart(first, start, frequency, anchorDay, anchorMonth);

    for (let i = 0; i < 4000; i++) {
      if (isAfter(cursor, end)) break;
      if ((!isBefore(cursor, start) || isSameDay(cursor, start)) && !isAfter(cursor, end)) {
        upcoming.push({
          recurringId: rec.id,
          dueDate: new Date(cursor),
          amount: rec.amount,
          category: rec.category,
          note: rec.note,
          frequency: rec.frequency,
        });
      }
      cursor = stepDate(cursor, frequency, anchorDay, anchorMonth);
    }
  }

  return upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

function getMonthKeysInRange(start: Date, end: Date): string[] {
  const keys: string[] = [];
  let cursor = startOfMonth(start);
  const endMonth = startOfMonth(end);
  for (let i = 0; i < 24; i++) {
    if (isAfter(cursor, endMonth)) break;
    keys.push(formatDayKey(startOfMonth(cursor)).slice(0, 7));
    cursor = addMonths(cursor, 1);
  }
  return keys;
}

async function getSkippedOccurrenceKeysInRange(userId: string, fromDate: Date | string, days = 30): Promise<Set<string>> {
  const start = startOfDayLocal(fromDate);
  const end = addDays(start, days);
  const months = getMonthKeysInRange(start, end);
  const sets = await Promise.all(
    months.map(async (month) => {
      try {
        return await getRecurringSkipKeysForMonth(userId, month);
      } catch {
        return new Set<string>();
      }
    })
  );
  const merged = new Set<string>();
  for (const set of sets) {
    for (const key of set) merged.add(key);
  }
  return merged;
}

export async function getUpcomingRecurringBillsForUser(
  userId: string,
  recurring: RecurringBill[],
  fromDate: Date | string = new Date(),
  days = 30
): Promise<UpcomingBill[]> {
  const upcoming = getUpcomingRecurringBills(recurring, fromDate, days);
  if (upcoming.length === 0) return upcoming;

  const skippedKeys = await getSkippedOccurrenceKeysInRange(userId, fromDate, days);
  if (skippedKeys.size === 0) return upcoming;

  return upcoming.filter((bill) => {
    if (!bill.recurringId) return true;
    const key = `${bill.recurringId}:${formatDayKey(bill.dueDate)}`;
    return !skippedKeys.has(key);
  });
}
