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
import type { BankConnection } from '../types/bank';
import toast from 'react-hot-toast';
import { HiChevronRight, HiCurrencyDollar, HiBuildingLibrary, HiCheckCircle, HiArrowPath, HiXMark } from 'react-icons/hi2';

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
      <div className="app-page-header px-4 mb-2">
        <h2 className="text-[34px] font-bold tracking-tight text-white mb-1">Settings</h2>
      </div>

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="space-y-8 mt-2 pb-24"
      >
        {/* Account Header */}
        <motion.div variants={itemVariants} className="px-4">
          <div className="bg-[#1C1C1E] rounded-[10px] p-4 flex items-center gap-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#2C2C2E] flex items-center justify-center text-[28px] font-normal text-white">
              {profile?.displayName?.trim().charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[20px] font-semibold text-white tracking-tight truncate mb-0.5">{profile?.displayName || 'User'}</h2>
              <p className="text-[15px] text-[#8E8E93] truncate mb-1.5">{profile?.email || user?.email}</p>
              <div className="inline-flex items-center rounded-md bg-[#2C2C2E] px-2 py-0.5 text-[12px] text-white font-medium">
                🔥 {profile?.currentStreak || 0} Day Streak
              </div>
            </div>
          </div>
        </motion.div>

        {/* Currencies Inset Group */}
        <motion.div variants={itemVariants}>
          <div className="mb-2 px-8">
            <h3 className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide">Preferences</h3>
          </div>
          <div className="mx-4 bg-[#1C1C1E] rounded-[10px] overflow-hidden">
            {/* Home Currency Row */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#38383A]">
              <div className="flex items-center gap-3.5">
                <div className="w-[30px] h-[30px] rounded-[7px] bg-[#34C759] flex items-center justify-center text-white">
                  <HiCurrencyDollar className="w-5 h-5" />
                </div>
                <span className="text-[17px] text-white">Home Currency</span>
              </div>
              <div className="flex items-center gap-1 max-w-[50%]">
                <select
                  value={homeCurr}
                  onChange={(e) => setHomeCurr(e.target.value)}
                  className="bg-transparent text-[17px] text-[#8E8E93] text-right focus:outline-none appearance-none truncate w-full"
                  dir="rtl"
                >
                  {currencyOptions.map(o => <option key={o.value} value={o.value} className="text-black text-left">{o.value}</option>)}
                </select>
                <HiChevronRight className="w-5 h-5 text-[#3A3A3C] shrink-0" />
              </div>
            </div>

            {/* Host Currency Row */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#38383A]">
              <div className="flex items-center gap-3.5">
                <div className="w-[30px] h-[30px] rounded-[7px] bg-[#0A84FF] flex items-center justify-center text-white">
                  <HiCurrencyDollar className="w-5 h-5" />
                </div>
                <span className="text-[17px] text-white">Host Currency</span>
              </div>
              <div className="flex items-center gap-1 max-w-[50%]">
                <select
                  value={hostCurr}
                  onChange={(e) => setHostCurr(e.target.value)}
                  className="bg-transparent text-[17px] text-[#8E8E93] text-right focus:outline-none appearance-none truncate w-full"
                  dir="rtl"
                >
                  {currencyOptions.map(o => <option key={o.value} value={o.value} className="text-black text-left">{o.value}</option>)}
                </select>
                <HiChevronRight className="w-5 h-5 text-[#3A3A3C] shrink-0" />
              </div>
            </div>

            {/* Save Button Row */}
            <button
              onClick={handleSaveCurrencies}
              disabled={homeCurr === profile?.homeCurrency && hostCurr === profile?.hostCurrency}
              className="w-full px-4 py-3 flex items-center bg-[#1C1C1E] active:bg-[#2C2C2E] transition-colors disabled:opacity-50"
            >
              <span className="text-[17px] text-[#0A84FF]">
                {saving ? 'Saving...' : 'Save Changes'}
              </span>
            </button>
          </div>
          {homeCurr && hostCurr && (
            <div className="mt-2 px-8">
              <p className="text-[13px] text-[#8E8E93]">Exchange rate: 1 {hostCurr} = {rate.toFixed(4)} {homeCurr}</p>
            </div>
          )}
        </motion.div>

        {/* Bank Connections Inset Group */}
        <motion.div variants={itemVariants}>
          <div className="mb-2 px-8 flex justify-between items-end">
            <h3 className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide">Bank Sync</h3>
            {!demoMode && (
              <button onClick={() => handleSyncBank()} disabled={!connections.length || linkingBank} className="text-[13px] text-[#0A84FF] font-medium active:opacity-60 disabled:opacity-50">
                {syncingConnectionId === '__all__' ? 'Syncing...' : 'Sync All'}
              </button>
            )}
          </div>

          <div className="mx-4 bg-[#1C1C1E] rounded-[10px] overflow-hidden">
            {demoMode ? (
              <div className="px-4 py-3 text-[17px] text-[#8E8E93]">Unavailable in Demo Mode</div>
            ) : loadingConnections ? (
              <div className="px-4 py-3 text-[17px] text-[#8E8E93] flex items-center gap-2">
                <HiArrowPath className="w-4 h-4 animate-spin text-[#8E8E93]" /> Loading...
              </div>
            ) : connections.length === 0 ? (
              <div className="px-4 py-3 text-[17px] text-[#8E8E93]">No linked accounts</div>
            ) : (
              connections.map((conn, index) => (
                <div key={conn.id} className={`px-4 py-2.5 flex items-center justify-between ${index < connections.length - 1 ? 'border-b border-[#38383A]' : ''}`}>
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    <div className="w-[30px] h-[30px] rounded-[7px] bg-[#5E5CE6] flex items-center justify-center text-white shrink-0">
                      <HiBuildingLibrary className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 pr-4">
                      <p className="text-[17px] text-white truncate">{conn.institutionName}</p>
                      <p className="text-[13px] text-[#8E8E93] truncate">{conn.accountCount} accts • {formatSyncTime(conn.lastSyncedAt)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleSyncBank(conn.id)}
                      disabled={disconnectingConnectionId === conn.id || syncingConnectionId === conn.id}
                      className="p-1.5 bg-[#2C2C2E] rounded-full text-white active:bg-[#38383A] disabled:opacity-50"
                    >
                      <HiArrowPath className={`w-4 h-4 ${syncingConnectionId === conn.id ? 'animate-spin text-[#0A84FF]' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDisconnectBank(conn.id)}
                      disabled={disconnectingConnectionId === conn.id || syncingConnectionId === conn.id}
                      className="p-1.5 bg-[#2C2C2E] rounded-full text-[#FF453A] active:bg-[#ff453A]/20 disabled:opacity-50"
                    >
                      <HiXMark className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {!demoMode && (
              <button
                onClick={handleLinkBank}
                disabled={linkingBank}
                className="w-full px-4 py-3 border-t border-[#38383A] flex items-center bg-[#1C1C1E] active:bg-[#2C2C2E] transition-colors"
              >
                <span className="text-[17px] text-[#0A84FF]">
                  {linkingBank ? 'Connecting...' : 'Add Account...'}
                </span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Achievements Group */}
        <motion.div variants={itemVariants}>
          <div className="mb-2 px-8">
            <h3 className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide">Achievements</h3>
          </div>
          <div className="mx-4 bg-[#1C1C1E] rounded-[10px] overflow-hidden">
            {ACHIEVEMENTS.map((a, index) => {
              const unlocked = userAchievements.includes(a.id);
              return (
                <div key={a.id} className={`px-4 py-2.5 flex items-center justify-between ${index < ACHIEVEMENTS.length - 1 ? 'border-b border-[#38383A]' : ''}`}>
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    <div className={`w-[30px] h-[30px] rounded-[7px] flex items-center justify-center shrink-0 ${unlocked ? 'bg-[#FF9F0A]' : 'bg-[#2C2C2E] grayscale'}`}>
                      <span className="text-sm drop-shadow-sm">{a.icon}</span>
                    </div>
                    <div className="min-w-0 pr-2">
                      <p className={`text-[17px] truncate ${unlocked ? 'text-white' : 'text-[#8E8E93]'}`}>{a.label}</p>
                      <p className="text-[13px] text-[#8E8E93] truncate">{a.description}</p>
                    </div>
                  </div>
                  {unlocked && (
                    <div className="shrink-0 text-[#34C759]">
                      <HiCheckCircle className="w-5 h-5" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Sign Out */}
        <motion.div variants={itemVariants} className="pt-2 px-4">
          <button
            onClick={handleSignOut}
            className="w-full bg-[#1C1C1E] rounded-[10px] p-3 text-center active:bg-[#2C2C2E] transition-colors"
          >
            <span className="text-[17px] text-[#FF453A]">Sign Out</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
