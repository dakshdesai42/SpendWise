/**
 * Maps Plaid personal_finance_category.primary values to SpendWise category IDs.
 *
 * SpendWise categories: food, transport, rent, entertainment, education, shopping, health, other
 * Plaid categories: https://plaid.com/documents/transactions-personal-finance-category-taxonomy.csv
 */

const PLAID_TO_SPENDWISE: Record<string, string> = {
  // Food & Drink
  FOOD_AND_DRINK: 'food',
  GROCERIES: 'food',

  // Transportation
  TRANSPORTATION: 'transport',
  TRAVEL: 'transport',

  // Housing
  RENT_AND_UTILITIES: 'rent',
  HOME_IMPROVEMENT: 'rent',

  // Entertainment
  ENTERTAINMENT: 'entertainment',
  RECREATION: 'entertainment',

  // Education
  EDUCATION: 'education',

  // Shopping / Retail
  GENERAL_MERCHANDISE: 'shopping',
  GENERAL_SERVICES: 'shopping',
  PERSONAL_CARE: 'shopping',

  // Health
  MEDICAL: 'health',

  // Transfers / payments — categorize as other
  TRANSFER_IN: 'other',
  TRANSFER_OUT: 'other',
  LOAN_PAYMENTS: 'other',
  BANK_FEES: 'other',
  INCOME: 'other',
  GOVERNMENT_AND_NON_PROFIT: 'other',
};

export function mapPlaidCategory(
  category?: { primary?: string; detailed?: string } | null
): string {
  if (!category?.primary) return 'other';
  return PLAID_TO_SPENDWISE[category.primary] || 'other';
}
