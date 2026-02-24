import { addDays } from 'date-fns';
import {
  collection,
  getDocsFromServer,
  query,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { getDb } from './firebase';
import { RecurringBill, UpcomingBill } from '../types/models';
import { formatDayKey, formatMonthKey, parseLocalDate, startOfDayLocal } from '../utils/date';

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

function recurringRef(userId: string) {
  return collection(getDb(), 'users', userId, 'recurringExpenses');
}

function recurringSkipsRef(userId: string) {
  return collection(getDb(), 'users', userId, 'recurringSkips');
}

function normalizeFrequency(value: string | undefined | null): Frequency {
  if (value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly') {
    return value;
  }
  return 'monthly';
}

function isRuleActive(value: unknown): boolean {
  if (value === false || value === null) return false;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized !== 'false' && normalized !== '0' && normalized !== 'no';
  }
  return true;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      const maybeTimestamp = value as Timestamp;
      const parsed = maybeTimestamp.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = parseLocalDate(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function resolveRuleStartDate(rule: RecurringBill & { createdAt?: unknown }): Date | null {
  const fromStart = toDate(rule.startDate);
  if (fromStart) return fromStart;

  const fromDue = toDate(rule.dueDate);
  if (fromDue) return fromDue;

  const fromCreated = toDate(rule.createdAt);
  if (fromCreated) return fromCreated;

  return null;
}

function addMonthsAnchored(date: Date, months: number, anchorDay: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(anchorDay, maxDay));
  return next;
}

function addYearsAnchored(date: Date, years: number, anchorDay: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setFullYear(next.getFullYear() + years);
  const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(anchorDay, maxDay));
  return next;
}

function step(date: Date, frequency: Frequency, anchorDay: number): Date {
  if (frequency === 'daily') return addDays(date, 1);
  if (frequency === 'weekly') return addDays(date, 7);
  if (frequency === 'yearly') return addYearsAnchored(date, 1, anchorDay);
  return addMonthsAnchored(date, 1, anchorDay);
}

function fastForward(start: Date, rangeStart: Date, frequency: Frequency, anchorDay: number): Date {
  let cursor = new Date(start);
  if (cursor >= rangeStart) return cursor;

  if (frequency === 'daily') {
    const dayDiff = Math.floor((rangeStart.getTime() - cursor.getTime()) / 86_400_000);
    if (dayDiff > 1) cursor = addDays(cursor, dayDiff - 1);
  } else if (frequency === 'weekly') {
    const weekDiff = Math.floor((rangeStart.getTime() - cursor.getTime()) / (7 * 86_400_000));
    if (weekDiff > 1) cursor = addDays(cursor, (weekDiff - 1) * 7);
  } else if (frequency === 'monthly') {
    const monthDiff = (rangeStart.getFullYear() - cursor.getFullYear()) * 12
      + (rangeStart.getMonth() - cursor.getMonth());
    if (monthDiff > 1) cursor = addMonthsAnchored(cursor, monthDiff - 1, anchorDay);
  } else {
    const yearDiff = rangeStart.getFullYear() - cursor.getFullYear();
    if (yearDiff > 1) cursor = addYearsAnchored(cursor, yearDiff - 1, anchorDay);
  }

  for (let i = 0; i < 2000 && cursor < rangeStart; i++) {
    cursor = step(cursor, frequency, anchorDay);
  }

  return cursor;
}

function buildOccurrenceKey(recurringId: string | undefined, dueDate: Date): string | null {
  if (!recurringId) return null;
  return `${recurringId}:${formatDayKey(dueDate)}`;
}

function collectMonths(fromDate: Date, days: number): string[] {
  const endDate = addDays(fromDate, days);
  const months = new Set<string>();
  let cursor = new Date(fromDate);
  while (cursor <= endDate) {
    months.add(formatMonthKey(cursor));
    const next = addMonthsAnchored(cursor, 1, 1);
    cursor = next;
  }
  return Array.from(months);
}

async function loadRecurringSkipKeysServerOnly(
  userId: string,
  fromDate: Date,
  days: number
): Promise<Set<string>> {
  const months = collectMonths(fromDate, days);
  const skips = new Set<string>();

  for (const month of months) {
    const monthQuery = query(recurringSkipsRef(userId), where('month', '==', month));
    const snapshot = await getDocsFromServer(monthQuery);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as { recurringOccurrenceKey?: string };
      const key = data.recurringOccurrenceKey || docSnap.id;
      if (key) skips.add(key);
    }
  }

  return skips;
}

export function computeUpcomingBillsFromRules(
  recurringRules: RecurringBill[],
  fromDate: Date | string = new Date(),
  days = 30,
  skippedOccurrenceKeys: Set<string> = new Set()
): UpcomingBill[] {
  const rangeStart = startOfDayLocal(fromDate);
  const rangeEnd = addDays(rangeStart, days);
  const upcoming: UpcomingBill[] = [];
  const dedupe = new Set<string>();

  for (const recurringRule of recurringRules) {
    if (!isRuleActive(recurringRule.isActive)) continue;
    if (!Number.isFinite(recurringRule.amount) || recurringRule.amount <= 0) continue;

    const firstDate = resolveRuleStartDate(recurringRule as RecurringBill & { createdAt?: unknown });
    if (!firstDate) continue;

    const frequency = normalizeFrequency(recurringRule.frequency);
    const anchorDay = firstDate.getDate();
    let occurrenceDate = fastForward(firstDate, rangeStart, frequency, anchorDay);

    for (let i = 0; i < 500 && occurrenceDate <= rangeEnd; i++) {
      if (occurrenceDate >= rangeStart) {
        const occurrenceKey = buildOccurrenceKey(recurringRule.id, occurrenceDate);
        if (!occurrenceKey || !skippedOccurrenceKeys.has(occurrenceKey)) {
          const dedupeKey = occurrenceKey || `${recurringRule.note || recurringRule.category}:${formatDayKey(occurrenceDate)}:${recurringRule.amount}`;
          if (!dedupe.has(dedupeKey)) {
            dedupe.add(dedupeKey);
            upcoming.push({
              recurringId: recurringRule.id,
              dueDate: new Date(occurrenceDate),
              amount: recurringRule.amount,
              category: recurringRule.category,
              note: recurringRule.note,
              frequency: recurringRule.frequency,
            });
          }
        }
      }
      occurrenceDate = step(occurrenceDate, frequency, anchorDay);
    }
  }

  return upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export async function getUpcomingBillsForUser(
  userId: string,
  fromDate: Date | string = new Date(),
  days = 30
): Promise<UpcomingBill[]> {
  const recurringSnapshot = await getDocsFromServer(recurringRef(userId));
  const recurringRules = recurringSnapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as RecurringBill),
    id: docSnap.id,
  }));

  const start = startOfDayLocal(fromDate);
  const skipped = await loadRecurringSkipKeysServerOnly(userId, start, days);

  return computeUpcomingBillsFromRules(recurringRules, start, days, skipped);
}
