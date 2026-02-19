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
import { db } from './firebase';
import { getMonthFromDate } from '../utils/formatters';

function expensesRef(userId) {
  return collection(db, 'users', userId, 'expenses');
}

function summariesRef(userId) {
  return collection(db, 'users', userId, 'monthlySummaries');
}

export async function addExpense(userId, expense) {
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

export async function addExpenseWithOptions(userId, expense, options = {}) {
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

export async function updateExpense(userId, expenseId, updates) {
  const expRef = doc(db, 'users', userId, 'expenses', expenseId);
  const updateData = { ...updates };

  if (updates.date) {
    updateData.date = Timestamp.fromDate(new Date(updates.date));
    updateData.month = getMonthFromDate(updates.date);
  }

  await updateDoc(expRef, updateData);

  if (updates.month) {
    await updateMonthlySummary(userId, updates.month);
  }
}

export async function deleteExpense(userId, expenseId, month) {
  await deleteDoc(doc(db, 'users', userId, 'expenses', expenseId));
  if (month) {
    await updateMonthlySummary(userId, month);
  }
}

export async function getExpensesByMonth(userId, month) {
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
  }));
}

export async function getRecentExpenses(userId, count = 5) {
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
  }));
}

export async function getExpensesInRange(userId, startDate, endDate) {
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
  }));
}

export async function updateMonthlySummary(userId, month) {
  const expenses = await getExpensesByMonth(userId, month);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSpentHome = expenses.reduce((sum, e) => sum + (e.amountHome || 0), 0);

  const categoryTotals = {};
  for (const e of expenses) {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  }

  const summaryRef = doc(db, 'users', userId, 'monthlySummaries', month);
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

export async function getMonthlySummary(userId, month) {
  const summaryRef = doc(db, 'users', userId, 'monthlySummaries', month);
  const snap = await getDoc(summaryRef);
  if (snap.exists()) {
    return snap.data();
  }
  return null;
}

export async function getMultipleMonthSummaries(userId, months) {
  const results = {};
  for (const month of months) {
    results[month] = await getMonthlySummary(userId, month);
  }
  return results;
}

export async function bulkAddExpenses(userId, expenses) {
  const touchedMonths = new Set();
  for (const expense of expenses) {
    touchedMonths.add(getMonthFromDate(expense.date));
    await addExpenseWithOptions(userId, expense, { skipSummary: true });
  }
  for (const month of touchedMonths) {
    await updateMonthlySummary(userId, month);
  }
}
