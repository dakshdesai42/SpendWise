import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { CURRENCY_MAP } from './constants';

export function formatCurrency(amount: number, currencyCode: string) {
  const currency = CURRENCY_MAP[currencyCode];
  const symbol = currency?.symbol || currencyCode;

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  return `${symbol}${formatted}`;
}

export function formatCurrencyCompact(amount: number, currencyCode: string) {
  const currency = CURRENCY_MAP[currencyCode];
  const symbol = currency?.symbol || currencyCode;

  if (Math.abs(amount) >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}K`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatDate(date: string | Date | number) {
  const d = date instanceof Date ? date : new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

export function formatDateShort(date: string | Date | number) {
  const d = date instanceof Date ? date : new Date(date);
  return format(d, 'MMM d');
}

export function formatMonth(monthStr: string) {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return format(date, 'MMMM yyyy');
}

export function formatRelative(date: string | Date | number) {
  const d = date instanceof Date ? date : new Date(date);
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getCurrentMonth() {
  return format(new Date(), 'yyyy-MM');
}

export function getMonthFromDate(date: string | Date | number) {
  const d = date instanceof Date ? date : new Date(date);
  return format(d, 'yyyy-MM');
}

export function percentOf(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
