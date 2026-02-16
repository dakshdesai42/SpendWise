import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { signOut } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { POPULAR_CURRENCIES, ACHIEVEMENTS } from '../utils/constants';
import { containerVariants, itemVariants } from '../utils/animations';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';

const currencyOptions = POPULAR_CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.symbol} ${c.code} — ${c.name}`,
}));

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, demoMode } = useAuth();
  const { hostCurrency, homeCurrency, getRate } = useCurrency();
  const [homeCurr, setHomeCurr] = useState(profile?.homeCurrency || '');
  const [hostCurr, setHostCurr] = useState(profile?.hostCurrency || '');
  const [saving, setSaving] = useState(false);

  const rate = getRate(hostCurrency, homeCurrency);
  const userAchievements = profile?.achievements || [];

  async function handleSaveCurrencies() {
    if (!homeCurr || !hostCurr) {
      toast.error('Please select both currencies');
      return;
    }
    if (demoMode) {
      toast.success('Currencies updated! (Demo mode)');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        homeCurrency: homeCurr,
        hostCurrency: hostCurr,
        updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      toast.success('Currencies updated!');
    } catch (err) {
      toast.error('Failed to update currencies');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (demoMode) {
      toast('Demo mode — nothing to sign out of');
      return;
    }
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      toast.error('Failed to sign out');
    }
  }

  return (
    <div>
      <div className="py-3 md:py-4 px-1 sm:px-0">
        <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-text-primary">Settings</h2>
        <p className="text-sm text-text-secondary mt-1">Manage your preferences</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="space-y-6 mt-3"
      >
        {/* Account */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <h3 className="text-sm font-medium text-text-secondary mb-4">Account</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-tertiary">Name</span>
                <span className="text-sm text-text-primary">{profile?.displayName || 'User'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-tertiary">Email</span>
                <span className="text-sm text-text-primary">{profile?.email || user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-tertiary">Streak</span>
                <span className="text-sm text-text-primary">
                  {profile?.currentStreak || 0} days (best: {profile?.longestStreak || 0})
                </span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Currencies */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <h3 className="text-sm font-medium text-text-secondary mb-4">Currencies</h3>
            <div className="space-y-4">
              <Select
                label="Home Currency (where you're from)"
                value={homeCurr}
                onChange={(e) => setHomeCurr(e.target.value)}
                options={currencyOptions}
              />
              <Select
                label="Host Currency (where you study)"
                value={hostCurr}
                onChange={(e) => setHostCurr(e.target.value)}
                options={currencyOptions}
              />

              {homeCurr && hostCurr && (
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                  <p className="text-xs text-text-tertiary">Current rate</p>
                  <p className="text-sm font-medium text-text-primary">
                    1 {hostCurr} = {rate.toFixed(4)} {homeCurr}
                  </p>
                </div>
              )}

              <Button
                onClick={handleSaveCurrencies}
                loading={saving}
                disabled={homeCurr === profile?.homeCurrency && hostCurr === profile?.hostCurrency}
                className="w-full"
              >
                Save Currencies
              </Button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Achievements */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <h3 className="text-sm font-medium text-text-secondary mb-4">Achievements</h3>
            <div className="grid grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = userAchievements.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`p-3 rounded-xl border transition-colors ${
                      unlocked
                        ? 'border-accent-primary/30 bg-accent-primary/5'
                        : 'border-white/[0.04] bg-white/[0.02] opacity-40'
                    }`}
                  >
                    <span className="text-2xl">{a.icon}</span>
                    <p className="text-xs font-medium text-text-primary mt-1">{a.label}</p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">{a.description}</p>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* Sign Out */}
        <motion.div variants={itemVariants}>
          <Button variant="danger" className="w-full" size="lg" onClick={handleSignOut}>
            Sign Out
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
