import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { getAuthInstance, getDb } from './firebase';
import { UserProfile } from '../types/models';

const googleProvider = new GoogleAuthProvider();

// Detect a reasonable default currency from the browser locale
function getLocaleCurrency(): string {
  try {
    const locale = navigator.language || 'en-US';
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
      .resolvedOptions();
    // Use region from locale to map to common currencies
    const region = locale.split('-')[1]?.toUpperCase();
    const regionCurrency: Record<string, string> = {
      US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', IN: 'INR',
      EU: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR',
      JP: 'JPY', CN: 'CNY', KR: 'KRW', SG: 'SGD', MY: 'MYR',
      PH: 'PHP', TH: 'THB', AE: 'AED', SA: 'SAR', NZ: 'NZD',
    };
    return regionCurrency[region] || parts.currency || 'USD';
  } catch {
    return 'USD';
  }
}

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
    hasSeenOnboarding: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(getAuthInstance(), email, password);
  return user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getAuthInstance(), email);
}

export async function signInWithGoogle(homeCurrency?: string, hostCurrency?: string): Promise<User> {
  if (Capacitor.isNativePlatform()) {
    const err = new Error('Google sign-in is not enabled for this mobile beta build. Use email/password.');
    (err as Error & { code?: string }).code = 'auth/google-native-unsupported';
    throw err;
  }

  const { user } = await signInWithPopup(getAuthInstance(), googleProvider);

  const userDoc = await getDoc(doc(getDb(), 'users', user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(getDb(), 'users', user.uid), {
      displayName: user.displayName || 'User',
      email: user.email,
      homeCurrency: homeCurrency || getLocaleCurrency(),
      hostCurrency: hostCurrency || getLocaleCurrency(),
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

export async function markOnboardingComplete(uid: string): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid), { hasSeenOnboarding: true }, { merge: true });
}
