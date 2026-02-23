import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { endOfMonth, startOfMonth } from 'date-fns';
import { Expense, MonthlySummary } from '../types/models';
import { getDb } from './firebase';
import { endOfDayLocal, formatMonthKey, parseLocalDate, parseMonthKey, startOfDayLocal } from '../utils/date';

function expensesRef(userId: string) {
  return collection(getDb(), 'users', userId, 'expenses');
}

function recurringSkipsRef(userId: string) {
  return collection(getDb(), 'users', userId, 'recurringSkips');
}

function recurringSkipDocRef(userId: string, recurringOccurrenceKey: string) {
  return doc(getDb(), 'users', userId, 'recurringSkips', recurringOccurrenceKey);
}

function normalizeStoredDate(value: unknown): Date {
  if (!value) {
    console.warn('normalizeStoredDate: missing date value, returning epoch');
    return new Date(0); // Return epoch instead of today to avoid misclassifying old data as "future"
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === 'function') {
      return maybeTimestamp.toDate();
    }
  }
  return parseLocalDate(value as string | Date | number);
}

export async function addExpense(userId: string, expense: Omit<Expense, 'id'>): Promise<string> {
  const expenseDate = parseLocalDate(expense.date);
  const month = formatMonthKey(expenseDate);
  const docRef = await addDoc(expensesRef(userId), {
    amount: expense.amount,
    amountHome: expense.amountHome,
    exchangeRate: expense.exchangeRate,
    category: expense.category,
    note: expense.note || '',
    date: Timestamp.fromDate(expenseDate),
    month,
    isRecurring: expense.isRecurring || false,
    frequency: expense.frequency || null,
    recurringId: expense.recurringId || null,
    recurringOccurrenceKey: expense.recurringOccurrenceKey || null,
    createdAt: serverTimestamp(),
  });

  await updateMonthlySummary(userId, month);
  return docRef.id;
}

export async function addExpenseWithOptions(userId: string, expense: Omit<Expense, 'id'>, options: { skipSummary?: boolean } = {}): Promise<string> {
  const expenseDate = parseLocalDate(expense.date);
  const month = formatMonthKey(expenseDate);
  const docRef = await addDoc(expensesRef(userId), {
    amount: expense.amount,
    amountHome: expense.amountHome,
    exchangeRate: expense.exchangeRate,
    category: expense.category,
    note: expense.note || '',
    date: Timestamp.fromDate(expenseDate),
    month,
    isRecurring: expense.isRecurring || false,
    frequency: expense.frequency || null,
    recurringId: expense.recurringId || null,
    recurringOccurrenceKey: expense.recurringOccurrenceKey || null,
    fingerprint: expense.fingerprint || null,
    createdAt: serverTimestamp(),
  });

  if (!options.skipSummary) {
    await updateMonthlySummary(userId, month);
  }
  return docRef.id;
}

export async function createRecurringOccurrenceIfMissing(
  userId: string,
  occurrenceId: string,
  expense: Omit<Expense, 'id'>
): Promise<boolean> {
  const expenseDate = parseLocalDate(expense.date);
  const month = formatMonthKey(expenseDate);
  const expRef = doc(getDb(), 'users', userId, 'expenses', occurrenceId);

  return runTransaction(getDb(), async (tx) => {
    const existing = await tx.get(expRef);
    if (existing.exists()) return false;

    tx.set(expRef, {
      amount: expense.amount,
      amountHome: expense.amountHome,
      exchangeRate: expense.exchangeRate,
      category: expense.category,
      note: expense.note || '',
      date: Timestamp.fromDate(expenseDate),
      month,
      isRecurring: expense.isRecurring || false,
      frequency: expense.frequency || null,
      recurringId: expense.recurringId || null,
      recurringOccurrenceKey: expense.recurringOccurrenceKey || null,
      fingerprint: expense.fingerprint || null,
      createdAt: serverTimestamp(),
    });

    return true;
  });
}

export async function updateExpense(userId: string, expenseId: string, updates: Partial<Expense>): Promise<void> {
  const expRef = doc(getDb(), 'users', userId, 'expenses', expenseId);
  const existingSnap = await getDoc(expRef);
  const existingMonth = existingSnap.exists() ? (existingSnap.data()?.month as string | undefined) : undefined;
  const updateData: Record<string, unknown> = { ...updates };

  if (updates.date) {
    const parsedDate = parseLocalDate(updates.date);
    updateData.date = Timestamp.fromDate(parsedDate);
    updateData.month = formatMonthKey(parsedDate);
  }

  await updateDoc(expRef, updateData);

  const monthsToRefresh = new Set<string>();
  if (existingMonth) monthsToRefresh.add(existingMonth);
  if (typeof updateData.month === 'string') monthsToRefresh.add(updateData.month);

  for (const month of monthsToRefresh) {
    await updateMonthlySummary(userId, month);
  }
}

export async function deleteExpense(userId: string, expenseId: string, month?: string): Promise<void> {
  const expRef = doc(getDb(), 'users', userId, 'expenses', expenseId);
  const snap = await getDoc(expRef);
  let monthToRefresh = month;

  type StoredExpenseLike = {
    month?: string;
    date?: unknown;
    isRecurring?: boolean;
    recurringId?: string | null;
    recurringOccurrenceKey?: string | null;
  };

  let recurringSkip: { recurringId: string; recurringOccurrenceKey: string; month: string } | null = null;
  if (snap.exists()) {
    const raw = snap.data() as StoredExpenseLike;
    const expenseDate = normalizeStoredDate(raw.date);
    const resolvedMonth = raw.month || formatMonthKey(expenseDate);
    if (!monthToRefresh) {
      monthToRefresh = resolvedMonth;
    }

    const recurringId = typeof raw.recurringId === 'string' && raw.recurringId.trim().length > 0
      ? raw.recurringId
      : null;
    const isRecurring = raw.isRecurring === true || !!recurringId;
    if (isRecurring && recurringId) {
      const recurringOccurrenceKey = typeof raw.recurringOccurrenceKey === 'string' && raw.recurringOccurrenceKey.trim().length > 0
        ? raw.recurringOccurrenceKey
        : `${recurringId}:${formatDayKey(expenseDate)}`;
      recurringSkip = {
        recurringId,
        recurringOccurrenceKey,
        month: resolvedMonth,
      };
    }
  }

  await deleteDoc(expRef);
  if (recurringSkip) {
    await markRecurringOccurrenceSkipped(
      userId,
      recurringSkip.recurringId,
      recurringSkip.recurringOccurrenceKey,
      recurringSkip.month
    );
  }
  if (monthToRefresh) {
    await updateMonthlySummary(userId, monthToRefresh);
  }
}

export async function getExpensesByMonth(userId: string, month: string): Promise<Expense[]> {
  const monthDate = parseMonthKey(month);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const q = query(
    expensesRef(userId),
    where('date', '>=', Timestamp.fromDate(monthStart)),
    where('date', '<=', Timestamp.fromDate(monthEnd)),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    ...d.data(),
    id: d.id,
    date: d.data().date?.toDate?.() || parseLocalDate(d.data().date),
  }) as Expense);
}

function summarizeExpenses(expenses: Expense[]): MonthlySummary {
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSpentHome = expenses.reduce((sum, e) => sum + (e.amountHome || 0), 0);

  const categoryTotals: Record<string, number> = {};
  for (const e of expenses) {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  }

  return {
    totalSpent,
    totalSpentHome,
    categoryTotals,
    transactionCount: expenses.length,
  };
}

export async function getRecentExpenses(userId: string, count = 5): Promise<Expense[]> {
  const q = query(
    expensesRef(userId),
    orderBy('date', 'desc'),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    ...d.data(),
    id: d.id,
    date: d.data().date?.toDate?.() || parseLocalDate(d.data().date),
  }) as Expense);
}

export async function getExpensesInRange(userId: string, startDate: string | Date, endDate: string | Date): Promise<Expense[]> {
  const rangeStart = startOfDayLocal(startDate);
  const rangeEnd = endOfDayLocal(endDate);
  const q = query(
    expensesRef(userId),
    where('date', '>=', Timestamp.fromDate(rangeStart)),
    where('date', '<=', Timestamp.fromDate(rangeEnd)),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    ...d.data(),
    id: d.id,
    date: d.data().date?.toDate?.() || parseLocalDate(d.data().date),
  }) as Expense);
}

export async function updateMonthlySummary(userId: string, month: string): Promise<void> {
  const expenses = await getExpensesByMonth(userId, month);
  const summary = summarizeExpenses(expenses);

  const summaryRef = doc(getDb(), 'users', userId, 'monthlySummaries', month);
  await updateDoc(summaryRef, {
    ...summary,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    // Doc doesn't exist yet, create it
    await setDoc(summaryRef, {
      ...summary,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function getMonthlySummary(userId: string, month: string): Promise<MonthlySummary | null> {
  const summaryRef = doc(getDb(), 'users', userId, 'monthlySummaries', month);
  const summarySnap = await getDoc(summaryRef);
  if (summarySnap.exists()) {
    return summarySnap.data() as MonthlySummary;
  }

  const expenses = await getExpensesByMonth(userId, month);
  if (expenses.length === 0) return null;
  const summary = summarizeExpenses(expenses);
  await setDoc(summaryRef, {
    ...summary,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return summary;
}

export async function getMultipleMonthSummaries(userId: string, months: string[]): Promise<Record<string, MonthlySummary | null>> {
  const results: Record<string, MonthlySummary | null> = {};
  const summaries = await Promise.all(months.map((month) => getMonthlySummary(userId, month)));
  for (let i = 0; i < months.length; i += 1) {
    results[months[i]] = summaries[i];
  }
  return results;
}

export async function bulkAddExpenses(userId: string, expenses: Omit<Expense, 'id'>[]): Promise<void> {
  const touchedMonths = new Set<string>();
  for (const expense of expenses) {
    touchedMonths.add(formatMonthKey(expense.date));
    await addExpenseWithOptions(userId, expense, { skipSummary: true });
  }
  for (const month of touchedMonths) {
    await updateMonthlySummary(userId, month);
  }
}

export async function deleteFutureRecurringOccurrences(
  userId: string,
  recurringId: string,
  fromDate: string | Date = new Date()
): Promise<number> {
  const cutoff = startOfDayLocal(fromDate);
  const recurringExpensesByIdQuery = query(expensesRef(userId), where('recurringId', '==', recurringId));
  const recurringByIdSnapshot = await getDocs(recurringExpensesByIdQuery);

  // Legacy fallback: some older recurring entries may only have recurringOccurrenceKey.
  const recurringKeyPrefix = `${recurringId}:`;
  const recurringExpensesByKeyQuery = query(
    expensesRef(userId),
    where('recurringOccurrenceKey', '>=', recurringKeyPrefix),
    where('recurringOccurrenceKey', '<=', `${recurringKeyPrefix}\uf8ff`)
  );
  let recurringByKeyDocs: Awaited<ReturnType<typeof getDocs>>['docs'] = [];
  try {
    const recurringByKeySnapshot = await getDocs(recurringExpensesByKeyQuery);
    recurringByKeyDocs = recurringByKeySnapshot.docs;
  } catch {
    recurringByKeyDocs = [];
  }

  const mergedDocs = new Map<string, (typeof recurringByIdSnapshot.docs)[number]>();
  for (const expenseDoc of recurringByIdSnapshot.docs) mergedDocs.set(expenseDoc.id, expenseDoc);
  for (const expenseDoc of recurringByKeyDocs) mergedDocs.set(expenseDoc.id, expenseDoc);

  const docsToDelete = Array.from(mergedDocs.values()).filter((expenseDoc) => {
    const rawDate = expenseDoc.data()?.date;
    const expenseDate = normalizeStoredDate(rawDate);
    return expenseDate.getTime() >= cutoff.getTime();
  });

  if (docsToDelete.length === 0) {
    return 0;
  }

  const touchedMonths = new Set<string>();
  for (const expenseDoc of docsToDelete) {
    const raw = expenseDoc.data() as { month?: string; date?: unknown };
    const expenseDate = normalizeStoredDate(raw.date);
    const month = raw.month || formatMonthKey(expenseDate);
    touchedMonths.add(month);
    await deleteDoc(expenseDoc.ref);
  }

  for (const month of touchedMonths) {
    await updateMonthlySummary(userId, month);
  }

  return docsToDelete.length;
}

export async function markRecurringOccurrenceSkipped(
  userId: string,
  recurringId: string,
  recurringOccurrenceKey: string,
  month: string
): Promise<void> {
  if (!recurringId || !recurringOccurrenceKey || !month) return;
  await setDoc(
    recurringSkipDocRef(userId, recurringOccurrenceKey),
    {
      recurringId,
      recurringOccurrenceKey,
      month,
      skippedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getRecurringSkipKeysForMonth(userId: string, month: string): Promise<Set<string>> {
  const q = query(recurringSkipsRef(userId), where('month', '==', month));
  const snapshot = await getDocs(q);
  return new Set(
    snapshot.docs
      .map((d) => {
        const data = d.data() as { recurringOccurrenceKey?: string };
        return data.recurringOccurrenceKey || d.id;
      })
      .filter((key): key is string => !!key)
  );
}

export async function deleteRecurringSkipsByRecurringId(userId: string, recurringId: string): Promise<number> {
  if (!recurringId) return 0;
  const q = query(recurringSkipsRef(userId), where('recurringId', '==', recurringId));
  const snapshot = await getDocs(q);
  for (const skipDoc of snapshot.docs) {
    await deleteDoc(skipDoc.ref);
  }
  return snapshot.docs.length;
}
