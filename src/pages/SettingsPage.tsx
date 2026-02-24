import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../services/firebase';
import { signOut } from '../services/auth';
import {
  dispatchBankSyncEvent,
  disconnectBankConnection,
  getBankConnections,
  linkBankAccountWithPlaid,
  syncBankTransactions,
} from '../services/bankSync';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { POPULAR_CURRENCIES, ACHIEVEMENTS } from '../utils/constants';
import { containerVariants, itemVariants } from '../utils/animations';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { BankConnection } from '../types/bank';
import toast from 'react-hot-toast';

const currencyOptions = POPULAR_CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.symbol} ${c.code} — ${c.name}`,
}));

export default function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, refreshProfile, demoMode } = useAuth();
  const { getRate } = useCurrency();
  const [homeCurr, setHomeCurr] = useState(profile?.homeCurrency || '');
  const [hostCurr, setHostCurr] = useState(profile?.hostCurrency || '');
  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [linkingBank, setLinkingBank] = useState(false);
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null);
  const [disconnectingConnectionId, setDisconnectingConnectionId] = useState<string | null>(null);

  useEffect(() => {
    setHomeCurr(profile?.homeCurrency || '');
    setHostCurr(profile?.hostCurrency || '');
  }, [profile?.homeCurrency, profile?.hostCurrency]);

  useEffect(() => {
    if (!user || demoMode) {
      setConnections([]);
      setLoadingConnections(false);
      return;
    }
    void loadConnections();
  }, [user?.uid, demoMode]);

  const rate = homeCurr && hostCurr ? getRate(hostCurr, homeCurr) : 0;
  const userAchievements = profile?.achievements || [];

  async function loadConnections() {
    if (!user || demoMode) return;
    setLoadingConnections(true);
    try {
      const list = await getBankConnections(user.uid);
      setConnections(list);
    } catch (error) {
      console.error('Failed to load bank connections:', error);
      toast.error('Unable to load linked bank accounts');
    } finally {
      setLoadingConnections(false);
    }
  }

  function formatSyncTime(value: string | null | undefined): string {
    if (!value) return 'Never synced';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sync time unavailable';
    return `Synced ${date.toLocaleString()}`;
  }

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
      await updateDoc(doc(getDb(), 'users', user!.uid), {
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

  async function handleLinkBank() {
    if (!user) return;
    if (demoMode) {
      toast('Bank linking is disabled in demo mode');
      return;
    }

    setLinkingBank(true);
    try {
      const result = await linkBankAccountWithPlaid(user.uid);
      toast.success(
        result.institutionName
          ? `Connected ${result.institutionName}`
          : 'Bank account linked successfully'
      );
      await loadConnections();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link bank account';
      if (message.toLowerCase().includes('canceled')) {
        toast(message);
      } else {
        toast.error(message);
      }
    } finally {
      setLinkingBank(false);
    }
  }

  async function handleSyncBank(connectionId?: string) {
    if (!user || demoMode) return;
    const syncKey = connectionId || '__all__';
    setSyncingConnectionId(syncKey);
    try {
      const result = await syncBankTransactions(user.uid, connectionId);
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets', user.uid] }),
        queryClient.invalidateQueries({ queryKey: ['recurring', user.uid] }),
      ]);
      dispatchBankSyncEvent({ ...result, source: 'manual' });
      toast.success(
        `Synced. Imported ${result.importedCount}, skipped ${result.skippedCount}, errors ${result.errorCount}.`
      );
      await loadConnections();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync bank transactions';
      toast.error(message);
    } finally {
      setSyncingConnectionId(null);
    }
  }

  async function handleDisconnectBank(connectionId: string) {
    if (!user || demoMode) return;
    setDisconnectingConnectionId(connectionId);
    try {
      await disconnectBankConnection(user.uid, connectionId);
      toast.success('Bank connection removed');
      await loadConnections();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect bank account';
      toast.error(message);
    } finally {
      setDisconnectingConnectionId(null);
    }
  }

  return (
    <div>
      <div className="app-page-header">
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
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="w-24 h-24 rounded-full bg-[#18181A] border border-white/[0.06] shadow-[0_16px_48px_rgba(0,0,0,0.8)] mb-6 flex items-center justify-center text-4xl font-light text-white font-serif uppercase">
              {profile?.displayName?.trim().charAt(0) || 'U'}
            </div>
            <h2 className="text-2xl font-semibold text-white mb-1 tracking-tight">{profile?.displayName || 'User'}</h2>
            <p className="text-[14px] text-white/40 mb-6 font-medium">{profile?.email || user?.email}</p>
            <div className="inline-flex items-center rounded-full bg-[#18181A] border border-white/[0.06] px-5 py-2.5 text-[13px] text-white font-medium shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
              🔥 {profile?.currentStreak || 0} Day Streak <span className="text-white/20 mx-2">|</span> <span className="text-white/50">Best: {profile?.longestStreak || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* Currencies */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 md:p-7">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Currencies</h3>
            <div className="space-y-4">
              <Select
                label="Home Currency (where you're from)"
                value={homeCurr}
                onChange={(e: any) => setHomeCurr(e.target.value)}
                options={currencyOptions}
              />
              <Select
                label="Host Currency (where you study)"
                value={hostCurr}
                onChange={(e: any) => setHostCurr(e.target.value)}
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
          <GlassCard className="p-6 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-medium text-text-secondary">Bank Connections (Beta)</h3>
                <p className="text-xs text-text-tertiary mt-1">
                  Link your bank account to import card transactions automatically.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleLinkBank}
                loading={linkingBank}
                disabled={!user || demoMode}
              >
                Link Bank
              </Button>
            </div>

            {demoMode ? (
              <p className="text-sm text-text-tertiary">
                Bank linking is unavailable in demo mode.
              </p>
            ) : loadingConnections ? (
              <div className="flex items-center gap-3 py-3">
                <LoadingSpinner size="sm" />
                <p className="text-sm text-text-tertiary">Loading linked accounts...</p>
              </div>
            ) : connections.length === 0 ? (
              <p className="text-sm text-text-tertiary">
                No linked bank accounts yet.
              </p>
            ) : (
              <div className="space-y-3">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {connection.institutionName}
                        </p>
                        <p className="text-xs text-text-tertiary mt-1">
                          {connection.accountCount} account{connection.accountCount === 1 ? '' : 's'} • {connection.status}
                        </p>
                        <p className="text-xs text-text-tertiary mt-1">
                          {formatSyncTime(connection.lastSyncedAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={syncingConnectionId === connection.id}
                          onClick={() => handleSyncBank(connection.id)}
                          disabled={disconnectingConnectionId === connection.id}
                        >
                          Sync
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={disconnectingConnectionId === connection.id}
                          onClick={() => handleDisconnectBank(connection.id)}
                          disabled={syncingConnectionId === connection.id}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!demoMode && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSyncBank()}
                  loading={syncingConnectionId === '__all__'}
                  disabled={!connections.length || linkingBank}
                >
                  Sync All
                </Button>
                <span className="text-[11px] text-text-tertiary">
                  Requires backend API at <code className="font-mono">VITE_BANK_API_BASE_URL</code>.
                </span>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Achievements */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 md:p-7">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Achievements</h3>
            <div className="grid grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = userAchievements.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`p-3 rounded-xl border transition-colors ${unlocked
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

        <motion.div variants={itemVariants} className="pt-4 pb-20">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center p-4 rounded-[20px] bg-[#FF453A]/10 text-[#FF453A] font-medium transition-all hover:bg-[#FF453A]/20 hover:shadow-[0_0_24px_rgba(255,69,58,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF453A]/50"
          >
            Sign Out
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
