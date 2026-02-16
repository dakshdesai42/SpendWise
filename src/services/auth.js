import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

export async function signUp(email, password, displayName, homeCurrency, hostCurrency) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });

  await setDoc(doc(db, 'users', user.uid), {
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

export async function signIn(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signInWithGoogle(homeCurrency, hostCurrency) {
  const { user } = await signInWithPopup(auth, googleProvider);

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', user.uid), {
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

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function getUserProfile(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
}
