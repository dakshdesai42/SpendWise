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
import { db } from './firebase';

function goalsRef(userId) {
  return collection(db, 'users', userId, 'goals');
}

export async function getGoals(userId) {
  const q = query(goalsRef(userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addGoal(userId, goal) {
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

export async function updateGoal(userId, goalId, updates) {
  await updateDoc(doc(db, 'users', userId, 'goals', goalId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGoal(userId, goalId) {
  await deleteDoc(doc(db, 'users', userId, 'goals', goalId));
}

export async function applyUnderspendToGoals(userId, amount) {
  if (!amount || amount <= 0) return { updated: 0 };
  const goals = await getGoals(userId);
  const activeGoals = goals.filter((g) => g.isActive !== false && (g.currentSaved || 0) < (g.targetAmount || 0));
  if (activeGoals.length === 0) return { updated: 0 };

  const share = amount / activeGoals.length;
  for (const goal of activeGoals) {
    const remaining = Math.max((goal.targetAmount || 0) - (goal.currentSaved || 0), 0);
    const delta = Math.min(share, remaining);
    await updateGoal(userId, goal.id, { currentSaved: (goal.currentSaved || 0) + delta });
  }
  return { updated: activeGoals.length };
}
