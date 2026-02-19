import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from './firebase';
import { Budget } from '../types/models';

export async function setBudget(userId: string, month: string, overall: number, categories: Record<string, number>, currency: string): Promise<void> {
  const budgetRef = doc(getDb(), 'users', userId, 'budgets', month);
  await setDoc(budgetRef, {
    month,
    overall,
    categories,
    currency,
    createdAt: serverTimestamp(),
  });
}

export async function getBudget(userId: string, month: string): Promise<Budget | null> {
  const budgetRef = doc(getDb(), 'users', userId, 'budgets', month);
  const snap = await getDoc(budgetRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as Budget;
  }
  return null;
}
