import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { Keyboard } from '@capacitor/keyboard';
import {
  HiHome,
  HiCreditCard,
  HiChartPie,
  HiCog6Tooth,
  HiPlus,
} from 'react-icons/hi2';

const leftItems = [
  { to: '/dashboard', icon: HiHome, label: 'Home' },
  { to: '/expenses', icon: HiCreditCard, label: 'Expenses' },
];

const rightItems = [
  { to: '/budgets', icon: HiChartPie, label: 'Budgets' },
  { to: '/settings', icon: HiCog6Tooth, label: 'Settings' },
];

export default function BottomNav({ onAddExpense }: { onAddExpense?: () => void }) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();

    let removeNativeListeners: (() => void) | null = null;
    if (isNative) {
      let showHandle: { remove: () => void } | null = null;
      let hideHandle: { remove: () => void } | null = null;
      let unmounted = false;

      Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true))
        .then((h) => { if (unmounted) h.remove(); else showHandle = h; });
      Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false))
        .then((h) => { if (unmounted) h.remove(); else hideHandle = h; });

      removeNativeListeners = () => {
        unmounted = true;
        showHandle?.remove();
        hideHandle?.remove();
      };
    }

    const viewport = window.visualViewport;
    const updateKeyboardInset = () => {
      if (!viewport) return;
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty('--keyboard-offset', `${Math.round(inset)}px`);
      // Web fallback for keyboard overlap in browsers/PWAs.
      if (!isNative) {
        setKeyboardVisible(inset > 80);
      }
    };

    updateKeyboardInset();
    viewport?.addEventListener('resize', updateKeyboardInset);
    viewport?.addEventListener('scroll', updateKeyboardInset);
    window.addEventListener('orientationchange', updateKeyboardInset);

    return () => {
      removeNativeListeners?.();
      viewport?.removeEventListener('resize', updateKeyboardInset);
      viewport?.removeEventListener('scroll', updateKeyboardInset);
      window.removeEventListener('orientationchange', updateKeyboardInset);
      document.documentElement.style.setProperty('--keyboard-offset', '0px');
    };
  }, []);

  return (
    <nav
      data-ios-liquid-tabbar="true"
      className={`lg:hidden fixed bottom-6 left-4 right-4 z-40 transition-all duration-300 ${keyboardVisible ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      style={{
        paddingBottom: 'var(--safe-area-bottom)',
      }}
    >
      <div
        className="flex items-center px-2 py-1.5 mx-auto max-w-[400px] rounded-[32px] border border-white/[0.06] bg-[#18181A]/90 backdrop-blur-2xl shadow-[0_24px_48px_rgba(0,0,0,0.8)]"
        style={{ minHeight: '4.5rem' }}
      >
        {/* Left side */}
        <div className="flex flex-1 justify-around">
          {leftItems.map((item) => (
            <NavTabItem key={item.to} item={item} />
          ))}
        </div>

        {/* Center FAB */}
        <div className="flex items-center justify-center px-3">
          <motion.button
            onClick={() => { hapticMedium(); onAddExpense?.(); }}
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center rounded-full bg-[#2D8CFF] shadow-[0_4px_24px_-4px_rgba(45,140,255,0.6)]"
            aria-label="Add expense"
            style={{
              width: '3.75rem',
              height: '3.75rem',
              marginTop: '-1.75rem',
            }}
          >
            <HiPlus className="w-8 h-8 text-white" strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Right side */}
        <div className="flex flex-1 justify-around">
          {rightItems.map((item) => (
            <NavTabItem key={item.to} item={item} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavTabItem({ item }: { item: { to: string; icon: any; label: string } }) {
  return (
    <NavLink
      to={item.to}
      onClick={() => hapticLight()}
      className="relative flex min-h-[3rem] w-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-2xl py-1.5"
      aria-label={item.label}
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={`w-[22px] h-[22px] transition-colors duration-200 relative z-10 ${isActive ? 'text-[#2D8CFF]' : 'text-white/40'
              }`}
          />
          <span
            className={`text-[10px] font-medium tracking-wide relative z-10 transition-colors duration-200 ${isActive ? 'text-[#2D8CFF]' : 'text-white/40'
              }`}
          >
            {item.label}
          </span>
          {/* Active dot indicator */}
          {isActive && (
            <motion.div
              layoutId="bottomnav-dot"
              className="absolute -top-0 w-1 h-1 rounded-full bg-[#2D8CFF] shadow-[0_0_8px_rgba(45,140,255,0.9)]"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}
