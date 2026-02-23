import { format } from 'date-fns';

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PREFIX_RE = /^(\d{4})-(\d{2})-(\d{2})[T\s]/;
const MONTH_KEY_RE = /^(\d{4})-(\d{2})$/;

function buildLocalDate(year: number, monthIndex: number, day: number): Date {
  // Use local noon to avoid DST/UTC boundary shifts when stepping months.
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

export function isDateOnlyString(value: string): boolean {
  return DATE_ONLY_RE.test(value.trim());
}

export function isMonthKey(value: string): boolean {
  return MONTH_KEY_RE.test(value.trim());
}

export function parseMonthKey(month: string): Date {
  const match = MONTH_KEY_RE.exec(month.trim());
  if (!match) {
    throw new Error(`Invalid month key: ${month}`);
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return buildLocalDate(year, monthIndex, 1);
}

export function parseLocalDate(value: string | Date | number): Date {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === 'number') return new Date(value);

  const text = value.trim();
  const dateMatch = DATE_ONLY_RE.exec(text);
  if (dateMatch) {
    const year = Number(dateMatch[1]);
    const monthIndex = Number(dateMatch[2]) - 1;
    const day = Number(dateMatch[3]);
    return buildLocalDate(year, monthIndex, day);
  }

  const dateTimeMatch = DATE_TIME_PREFIX_RE.exec(text);
  if (dateTimeMatch) {
    const year = Number(dateTimeMatch[1]);
    const monthIndex = Number(dateTimeMatch[2]) - 1;
    const day = Number(dateTimeMatch[3]);
    return buildLocalDate(year, monthIndex, day);
  }

  const monthMatch = MONTH_KEY_RE.exec(text);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const monthIndex = Number(monthMatch[2]) - 1;
    return buildLocalDate(year, monthIndex, 1);
  }

  return new Date(text);
}

export function formatMonthKey(value: string | Date | number): string {
  return format(parseLocalDate(value), 'yyyy-MM');
}

export function formatDayKey(value: string | Date | number): string {
  return format(parseLocalDate(value), 'yyyy-MM-dd');
}

export function startOfDayLocal(value: string | Date | number): Date {
  const date = parseLocalDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDayLocal(value: string | Date | number): Date {
  const date = parseLocalDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
