/// <reference types="vite/client" />
import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  // Use initializeAuth with browserLocalPersistence to avoid indexedDB
  // hanging on Capacitor iOS (capacitor:// scheme breaks default persistence)
  auth = initializeAuth(app, { persistence: browserLocalPersistence });
  db = getFirestore(app);
}

function getDb(): Firestore {
  if (!db) throw new Error('Firestore is not initialized. Check Firebase configuration.');
  return db;
}

function getAuthInstance(): Auth {
  if (!auth) throw new Error('Auth is not initialized. Check Firebase configuration.');
  return auth;
}

export { auth, db, getDb, getAuthInstance };
export default app;
