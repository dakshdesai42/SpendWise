import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import type { Auth } from 'firebase/auth';
import { getUserProfile } from '../services/auth';
import { UserProfile } from '../types/models';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Demo mode — skip Firebase auth, show full UI with sample data
      setDemoMode(true);
      setUser({ uid: 'demo-user', displayName: 'Demo Student', email: 'demo@university.edu' } as User);
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth as Auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userProfile = await getUserProfile(firebaseUser.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
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

