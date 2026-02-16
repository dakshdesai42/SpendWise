import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { getUserProfile } from '../services/auth';

const AuthContext = createContext(null);

// Demo profile for when Firebase is not configured
const DEMO_PROFILE = {
  id: 'demo-user',
  displayName: 'Demo Student',
  email: 'demo@university.edu',
  homeCurrency: 'INR',
  hostCurrency: 'USD',
  currentStreak: 5,
  longestStreak: 12,
  lastLogDate: new Date().toISOString().split('T')[0],
  achievements: ['first_expense', 'streak_3', 'streak_7'],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Demo mode — skip Firebase auth, show full UI with sample data
      setDemoMode(true);
      setUser({ uid: 'demo-user', displayName: 'Demo Student', email: 'demo@university.edu' });
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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

  const value = {
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
