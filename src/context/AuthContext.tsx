import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import type { Auth } from 'firebase/auth';
import { getUserProfile } from '../services/auth';
import { UserProfile } from '../types/models';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  demoMode: boolean;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Demo profile for when Firebase is not configured
const DEMO_PROFILE: UserProfile = {
  uid: 'demo-user',
  displayName: 'Demo Student',
  email: 'demo@university.edu',
  currentStreak: 5,
  longestStreak: 12,
  lastLogin: new Date().toISOString().split('T')[0],
};

const AUTH_PROFILE_TIMEOUT_MS = 10000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs = AUTH_PROFILE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Timed out while loading user profile.'));
    }, timeoutMs);

    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => window.clearTimeout(timeoutId));
  });
}

function hideSplash() {
  if (Capacitor.isNativePlatform()) {
    SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const splashHiddenRef = useRef(false);

  // Hide splash once auth state resolves (exactly once)
  useEffect(() => {
    if (!loading && !splashHiddenRef.current) {
      splashHiddenRef.current = true;
      hideSplash();
    }
  }, [loading]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Demo mode — skip Firebase auth, show full UI with sample data
      setDemoMode(true);
      setUser({ uid: 'demo-user', displayName: 'Demo Student', email: 'demo@university.edu' } as User);
      setProfile(DEMO_PROFILE);
      setAuthError(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth as Auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const userProfile = await withTimeout(getUserProfile(firebaseUser.uid));
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
        setAuthError(null);
      } catch (error) {
        console.error('Auth profile fetch failed:', error);
        // Keep the user authenticated — only the profile failed to load.
        // Setting user to null would kick an authenticated user back to login
        // on iOS network transitions (WiFi→cellular) or slow connections.
        setProfile(null);
        setAuthError(error instanceof Error ? error.message : 'Profile fetch failed');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function refreshProfile() {
    if (demoMode) return;
    if (user) {
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    loading,
    authError,
    demoMode,
    refreshProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
