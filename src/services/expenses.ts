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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { Expense, MonthlySummary } from '../types/models';
import { getDb } from './firebase';
import { getMonthFromDate } from '../utils/formatters';

function expensesRef(userId: string) {
  return collection(getDb(), 'users', userId, 'expenses');
}

export async function addExpense(userId: string, expense: Omit<Expense, 'id'>): Promise<string> {
  const month = getMonthFromDate(expense.date);
  const docRef = await addDoc(expensesRef(userId), {
    amount: expense.amount,
    amountHome: expense.amountHome,
    exchangeRate: expense.exchangeRate,
    category: expense.category,
    note: expense.note || '',
    date: Timestamp.fromDate(new Date(expense.date)),
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
  const month = getMonthFromDate(expense.date);
  const docRef = await addDoc(expensesRef(userId), {
    amount: expense.amount,
    amountHome: expense.amountHome,
    exchangeRate: expense.exchangeRate,
    category: expense.category,
    note: expense.note || '',
    date: Timestamp.fromDate(new Date(expense.date)),
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

export async function updateExpense(userId: string, expenseId: string, updates: Partial<Expense>): Promise<void> {
  const expRef = doc(getDb(), 'users', userId, 'expenses', expenseId);
  const updateData: Record<string, unknown> = { ...updates };

  if (updates.date) {
    updateData.date = Timestamp.fromDate(new Date(updates.date));
    updateData.month = getMonthFromDate(updates.date);
  }

  await updateDoc(expRef, updateData);

  if (updateData.month) {
    await updateMonthlySummary(userId, updateData.month as string);
  }
}

export async function deleteExpense(userId: string, expenseId: string, month?: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', userId, 'expenses', expenseId));
  if (month) {
    await updateMonthlySummary(userId, month);
  }
}

export async function getExpensesByMonth(userId: string, month: string): Promise<Expense[]> {
  const q = query(
    expensesRef(userId),
    where('month', '==', month),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: d.data().date?.toDate?.() || new Date(d.data().date),
  }) as Expense);
}

export async function getRecentExpenses(userId: string, count = 5): Promise<Expense[]> {
  const q = query(
    expensesRef(userId),
    orderBy('date', 'desc'),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: d.data().date?.toDate?.() || new Date(d.data().date),
  }) as Expense);
}

export async function getExpensesInRange(userId: string, startDate: string | Date, endDate: string | Date): Promise<Expense[]> {
  const q = query(
    expensesRef(userId),
    where('date', '>=', Timestamp.fromDate(new Date(startDate))),
    where('date', '<=', Timestamp.fromDate(new Date(endDate))),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: d.data().date?.toDate?.() || new Date(d.data().date),
  }) as Expense);
}

export async function updateMonthlySummary(userId: string, month: string): Promise<void> {
  const expenses = await getExpensesByMonth(userId, month);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSpentHome = expenses.reduce((sum, e) => sum + (e.amountHome || 0), 0);

  const categoryTotals: Record<string, number> = {};
  for (const e of expenses) {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  }

  const summaryRef = doc(getDb(), 'users', userId, 'monthlySummaries', month);
  await updateDoc(summaryRef, {
    totalSpent,
    totalSpentHome,
    categoryTotals,
    transactionCount: expenses.length,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    // Doc doesn't exist yet, create it
    await setDoc(summaryRef, {
      totalSpent,
      totalSpentHome,
      categoryTotals,
      transactionCount: expenses.length,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function getMonthlySummary(userId: string, month: string): Promise<MonthlySummary | null> {
  const summaryRef = doc(getDb(), 'users', userId, 'monthlySummaries', month);
  const snap = await getDoc(summaryRef);
  if (snap.exists()) {
    return snap.data() as MonthlySummary;
  }
  return null;
}

export async function getMultipleMonthSummaries(userId: string, months: string[]): Promise<Record<string, MonthlySummary | null>> {
  const results: Record<string, MonthlySummary | null> = {};
  for (const month of months) {
    results[month] = await getMonthlySummary(userId, month);
  }
  return results;
}

export async function bulkAddExpenses(userId: string, expenses: Omit<Expense, 'id'>[]): Promise<void> {
  const touchedMonths = new Set<string>();
  for (const expense of expenses) {
    touchedMonths.add(getMonthFromDate(expense.date));
    await addExpenseWithOptions(userId, expense, { skipSummary: true });
  }
  for (const month of touchedMonths) {
    await updateMonthlySummary(userId, month);
  }
}
