import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfMonth,
} from 'date-fns';
import { getDb } from './firebase';
import { getExpensesByMonth, addExpenseWithOptions, updateMonthlySummary } from './expenses';
import { RecurringBill, UpcomingBill } from '../types/models';

function recurringRef(userId: string) {
  return collection(getDb(), 'users', userId, 'recurringExpenses');
}

export async function getRecurringExpenses(userId: string): Promise<RecurringBill[]> {
  const q = query(recurringRef(userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data() as RecurringBill,
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

export async function deleteRecurringExpense(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', userId, 'recurringExpenses', id));
}

export async function toggleRecurringExpense(userId: string, id: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(getDb(), 'users', userId, 'recurringExpenses', id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

function stepDate(date: Date, frequency: string): Date {
  if (frequency === 'daily') return addDays(date, 1);
  if (frequency === 'weekly') return addWeeks(date, 1);
  if (frequency === 'yearly') return addYears(date, 1);
  return addMonths(date, 1);
}

function getOccurrencesInMonth(recurringExpense: RecurringBill, month: string): Date[] {
  const [year, mon] = month.split('-').map(Number);
  const start = startOfMonth(new Date(year, mon - 1, 1));
  const end = endOfMonth(start);
  if (!recurringExpense.startDate) return [];
  const first = new Date(recurringExpense.startDate);
  if (isAfter(first, end)) return [];

  let cursor = first;
  const occurrences: Date[] = [];
  for (let i = 0; i < 500; i++) {
    if (isAfter(cursor, end)) break;
    if (!isBefore(cursor, start) || isSameDay(cursor, start)) {
      occurrences.push(new Date(cursor));
    }
    cursor = stepDate(cursor, recurringExpense.frequency || 'monthly');
  }
  return occurrences;
}

export async function autoPostRecurringForMonth(userId: string, month: string, options: { cutoffDate?: string | Date } = {}): Promise<{ created: number }> {
  const cutoffDate = options.cutoffDate ? new Date(options.cutoffDate) : new Date();
  const recurring = await getRecurringExpenses(userId);
  const activeRecurring = recurring.filter((r) => r.isActive);
  if (activeRecurring.length === 0) return { created: 0 };

  const monthExpenses = await getExpensesByMonth(userId, month);
  const existingKeys = new Set(
    monthExpenses
      .filter((e) => e.recurringOccurrenceKey)
      .map((e) => e.recurringOccurrenceKey)
  );

  let created = 0;
  for (const rec of activeRecurring) {
    const occurrences = getOccurrencesInMonth(rec, month)
      .filter((d) => !isAfter(d, cutoffDate));

    for (const occ of occurrences) {
      const key = `${rec.id}:${format(occ, 'yyyy-MM-dd')}`;
      if (existingKeys.has(key)) continue;

      await addExpenseWithOptions(
        userId,
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
        },
        { skipSummary: true }
      );
      existingKeys.add(key);
      created += 1;
    }
  }

  if (created > 0) {
    await updateMonthlySummary(userId, month);
  }
  return { created };
}

export function getUpcomingRecurringBills(recurring: RecurringBill[], fromDate: Date | string = new Date(), days = 30): UpcomingBill[] {
  const start = new Date(fromDate);
  const end = addDays(start, days);
  const upcoming: UpcomingBill[] = [];

  for (const rec of recurring.filter((r) => r.isActive)) {
    if (!rec.startDate) continue;
    let cursor = new Date(rec.startDate);
    for (let i = 0; i < 800; i++) {
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
      cursor = stepDate(cursor, rec.frequency || 'monthly');
    }
  }

  return upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}
