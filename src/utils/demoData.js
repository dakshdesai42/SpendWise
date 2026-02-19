import { addMonths, format, subDays, subMonths } from 'date-fns';

const today = new Date();

export const DEMO_EXPENSES = [
  { id: 'd1', amount: 12.50, amountHome: 1043.75, exchangeRate: 83.5, category: 'food', note: 'Lunch at campus cafe', date: subDays(today, 0), month: format(today, 'yyyy-MM') },
  { id: 'd2', amount: 8.00, amountHome: 668.00, exchangeRate: 83.5, category: 'transport', note: 'Uber to campus', date: subDays(today, 0), month: format(today, 'yyyy-MM') },
  { id: 'd3', amount: 45.00, amountHome: 3757.50, exchangeRate: 83.5, category: 'education', note: 'Textbook - Data Structures', date: subDays(today, 1), month: format(today, 'yyyy-MM') },
  { id: 'd4', amount: 15.99, amountHome: 1335.12, exchangeRate: 83.5, category: 'entertainment', note: 'Netflix subscription', date: subDays(today, 2), month: format(today, 'yyyy-MM') },
  { id: 'd5', amount: 67.30, amountHome: 5619.55, exchangeRate: 83.5, category: 'food', note: 'Weekly groceries', date: subDays(today, 3), month: format(today, 'yyyy-MM') },
  { id: 'd6', amount: 850.00, amountHome: 70975.00, exchangeRate: 83.5, category: 'rent', note: 'Monthly rent', date: subDays(today, 5), month: format(today, 'yyyy-MM') },
  { id: 'd7', amount: 23.40, amountHome: 1953.90, exchangeRate: 83.5, category: 'shopping', note: 'Amazon - USB cable', date: subDays(today, 6), month: format(today, 'yyyy-MM') },
  { id: 'd8', amount: 35.00, amountHome: 2922.50, exchangeRate: 83.5, category: 'health', note: 'Gym membership', date: subDays(today, 7), month: format(today, 'yyyy-MM') },
  { id: 'd9', amount: 9.50, amountHome: 793.25, exchangeRate: 83.5, category: 'food', note: 'Coffee & pastry', date: subDays(today, 8), month: format(today, 'yyyy-MM') },
  { id: 'd10', amount: 4.50, amountHome: 375.75, exchangeRate: 83.5, category: 'transport', note: 'Bus pass reload', date: subDays(today, 9), month: format(today, 'yyyy-MM') },
  { id: 'd11', amount: 18.90, amountHome: 1578.15, exchangeRate: 83.5, category: 'food', note: 'Dinner with friends', date: subDays(today, 10), month: format(today, 'yyyy-MM') },
  { id: 'd12', amount: 55.00, amountHome: 4592.50, exchangeRate: 83.5, category: 'shopping', note: 'Winter jacket (sale)', date: subDays(today, 12), month: format(today, 'yyyy-MM') },
];

export const DEMO_SUMMARY = {
  totalSpent: DEMO_EXPENSES.reduce((s, e) => s + e.amount, 0),
  totalSpentHome: DEMO_EXPENSES.reduce((s, e) => s + e.amountHome, 0),
  categoryTotals: DEMO_EXPENSES.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {}),
  transactionCount: DEMO_EXPENSES.length,
};

export const DEMO_BUDGET = {
  id: 'demo-budget',
  month: format(today, 'yyyy-MM'),
  overall: 2000,
  categories: {
    food: 400,
    transport: 150,
    rent: 900,
    entertainment: 100,
    education: 200,
    shopping: 150,
    health: 50,
  },
  currency: 'USD',
};

export const DEMO_RECURRING = [
  { id: 'r1', amount: 850.00, amountHome: 70975.00, exchangeRate: 83.5, category: 'rent', note: 'Monthly rent', frequency: 'monthly', startDate: subDays(today, 30).toISOString(), isActive: true },
  { id: 'r2', amount: 15.99, amountHome: 1335.12, exchangeRate: 83.5, category: 'entertainment', note: 'Netflix subscription', frequency: 'monthly', startDate: subDays(today, 60).toISOString(), isActive: true },
  { id: 'r3', amount: 35.00, amountHome: 2922.50, exchangeRate: 83.5, category: 'health', note: 'Gym membership', frequency: 'monthly', startDate: subDays(today, 90).toISOString(), isActive: true },
  { id: 'r4', amount: 9.99, amountHome: 834.17, exchangeRate: 83.5, category: 'entertainment', note: 'Spotify Premium', frequency: 'monthly', startDate: subDays(today, 45).toISOString(), isActive: false },
];

export const DEMO_GOALS = [
  { id: 'g1', title: 'Japan Trip Fund', targetAmount: 1800, currentSaved: 740, targetDate: format(addMonths(today, 4), 'yyyy-MM-dd'), isActive: true },
  { id: 'g2', title: 'Emergency Cushion', targetAmount: 2500, currentSaved: 980, targetDate: format(addMonths(today, 8), 'yyyy-MM-dd'), isActive: true },
];

export const DEMO_TREND = [
  { month: format(subMonths(today, 5), 'MMM'), total: 1650 },
  { month: format(subMonths(today, 4), 'MMM'), total: 1820 },
  { month: format(subMonths(today, 3), 'MMM'), total: 1540 },
  { month: format(subMonths(today, 2), 'MMM'), total: 1930 },
  { month: format(subMonths(today, 1), 'MMM'), total: 1750 },
  { month: format(today, 'MMM'), total: DEMO_SUMMARY.totalSpent },
];
