import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Recalculates the monthly summary for a given user and month.
 * Mirrors the logic in src/services/expenses.ts:223-286.
 */
export async function updateMonthlySummary(
  userId: string,
  month: string
): Promise<void> {
  const db = getFirestore();
  const expensesRef = db.collection(`users/${userId}/expenses`);
  const snapshot = await expensesRef.where('month', '==', month).get();

  let totalSpent = 0;
  let totalSpentHome = 0;
  const categoryTotals: Record<string, number> = {};

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const amount = typeof data.amount === 'number' ? data.amount : 0;
    const amountHome = typeof data.amountHome === 'number' ? data.amountHome : 0;

    totalSpent += amount;
    totalSpentHome += amountHome;

    const cat = data.category || 'other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
  }

  const summary = {
    totalSpent,
    totalSpentHome,
    categoryTotals,
    transactionCount: snapshot.size,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const summaryRef = db.doc(`users/${userId}/monthlySummaries/${month}`);
  await summaryRef.set(summary, { merge: true });
}
