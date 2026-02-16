import {
  collection,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

function budgetsRef(userId) {
  return collection(db, 'users', userId, 'budgets');
}

export async function setBudget(userId, month, overall, categories, currency) {
  const budgetRef = doc(db, 'users', userId, 'budgets', month);
  await setDoc(budgetRef, {
    month,
    overall,
    categories,
    currency,
    createdAt: serverTimestamp(),
  });
}

export async function getBudget(userId, month) {
  const budgetRef = doc(db, 'users', userId, 'budgets', month);
  const snap = await getDoc(budgetRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}
