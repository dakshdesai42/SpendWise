export const CATEGORIES = [
  { id: 'food', label: 'Food', icon: '🍔', color: '#8b5cf6' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#06b6d4' },
  { id: 'rent', label: 'Rent', icon: '🏠', color: '#3b82f6' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎮', color: '#f59e0b' },
  { id: 'education', label: 'Education', icon: '📚', color: '#10b981' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { id: 'health', label: 'Health', icon: '❤️', color: '#14b8a6' },
  { id: 'other', label: 'Other', icon: '📦', color: '#6b7280' },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export const POPULAR_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'NRs' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
];

export const CURRENCY_MAP = Object.fromEntries(
  POPULAR_CURRENCIES.map((c) => [c.code, c])
);

export const ACHIEVEMENTS = [
  { id: 'streak_3', label: '3-Day Streak', icon: '🔥', description: 'Log expenses 3 days in a row' },
  { id: 'streak_7', label: 'Week Warrior', icon: '⚡', description: 'Log expenses 7 days in a row' },
  { id: 'streak_30', label: 'Monthly Master', icon: '🏆', description: 'Log expenses 30 days in a row' },
  { id: 'first_expense', label: 'First Step', icon: '👣', description: 'Log your first expense' },
  { id: 'first_month', label: 'Month One', icon: '📅', description: 'Complete your first month of tracking' },
  { id: 'under_budget', label: 'Budget Boss', icon: '💰', description: 'Stay under budget for a full month' },
  { id: 'under_budget_3', label: 'Triple Saver', icon: '🌟', description: 'Stay under budget 3 months in a row' },
  { id: 'fifty_expenses', label: 'Half Century', icon: '📊', description: 'Log 50 expenses total' },
  { id: 'imported_statement', label: 'Smart Import', icon: '📄', description: 'Import your first bank statement' },
  { id: 'no_spend_day', label: 'Zero Day', icon: '🎯', description: 'Log a no-spend day' },
];
