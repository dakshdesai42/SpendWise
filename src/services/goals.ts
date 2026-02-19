import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from './firebase';
import { Goal } from '../types/models';

function goalsRef(userId: string) {
  return collection(getDb(), 'users', userId, 'goals');
}

export async function getGoals(userId: string): Promise<Goal[]> {
  const q = query(goalsRef(userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() as Goal }));
}

export async function addGoal(userId: string, goal: Omit<Goal, 'id'>): Promise<string> {
  const ref = await addDoc(goalsRef(userId), {
    title: goal.title,
    targetAmount: goal.targetAmount,
    currentSaved: goal.currentSaved || 0,
    targetDate: goal.targetDate || null,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGoal(userId: string, goalId: string, updates: Partial<Goal>): Promise<void> {
  await updateDoc(doc(getDb(), 'users', userId, 'goals', goalId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', userId, 'goals', goalId));
}

export async function applyUnderspendToGoals(userId: string, amount: number): Promise<{ updated: number }> {
  if (!amount || amount <= 0) return { updated: 0 };
  const goals = await getGoals(userId);
  const activeGoals = goals.filter((g) => g.isActive !== false && (g.currentSaved || 0) < (g.targetAmount || 0));
  if (activeGoals.length === 0) return { updated: 0 };

  const share = amount / activeGoals.length;
  for (const goal of activeGoals) {
    const remaining = Math.max((goal.targetAmount || 0) - (goal.currentSaved || 0), 0);
    const delta = Math.min(share, remaining);
    await updateGoal(userId, goal.id!, { currentSaved: (goal.currentSaved || 0) + delta });
  }
  return { updated: activeGoals.length };
}
