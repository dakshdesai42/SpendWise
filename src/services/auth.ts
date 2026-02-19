import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getAuthInstance, getDb } from './firebase';
import { UserProfile } from '../types/models';

const googleProvider = new GoogleAuthProvider();

export async function signUp(email: string, password: string, displayName: string, homeCurrency: string, hostCurrency: string): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(getAuthInstance(), email, password);
  await updateProfile(user, { displayName });

  await setDoc(doc(getDb(), 'users', user.uid), {
    displayName,
    email,
    homeCurrency,
    hostCurrency,
    currentStreak: 0,
    longestStreak: 0,
    lastLogDate: null,
    achievements: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(getAuthInstance(), email, password);
  return user;
}

export async function signInWithGoogle(homeCurrency?: string, hostCurrency?: string): Promise<User> {
  const { user } = await signInWithPopup(getAuthInstance(), googleProvider);

  const userDoc = await getDoc(doc(getDb(), 'users', user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(getDb(), 'users', user.uid), {
      displayName: user.displayName || 'User',
      email: user.email,
      homeCurrency: homeCurrency || 'INR',
      hostCurrency: hostCurrency || 'USD',
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      achievements: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getAuthInstance());
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(getDb(), 'users', uid));
  if (userDoc.exists()) {
    return { id: userDoc.id, uid: userDoc.id, ...userDoc.data() } as UserProfile;
  }
  return null;
}
