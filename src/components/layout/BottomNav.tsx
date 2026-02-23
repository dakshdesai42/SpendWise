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
      className={`bottom-nav-shell lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform duration-200 ${keyboardVisible ? 'translate-y-full pointer-events-none' : 'translate-y-0'
        }`}
      style={{
        paddingBottom: 'var(--safe-area-bottom)',
        paddingLeft: 'max(0.5rem, var(--safe-area-left))',
        paddingRight: 'max(0.5rem, var(--safe-area-right))',
      }}
    >
      <div className="bottom-nav-track flex items-center px-1.5" style={{ height: 'var(--bottom-nav-height)' }}>
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
            className="bottom-nav-fab flex items-center justify-center rounded-full border border-white/20 shadow-lg shadow-accent-primary/35"
            aria-label="Add expense"
            style={{
              width: 'var(--bottom-nav-fab-size, 3.5rem)',
              height: 'var(--bottom-nav-fab-size, 3.5rem)',
              marginTop: 'calc(var(--bottom-nav-fab-lift, 1.5rem) * -1)',
              background: 'linear-gradient(135deg, var(--color-accent-primary) 0%, #0066d6 100%)',
            }}
          >
            <HiPlus className="w-7 h-7 text-white" strokeWidth={2.5} />
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
      className="bottom-nav-item relative flex min-h-11 w-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl py-1.5"
      aria-label={item.label}
    >
      {({ isActive }) => (
        <>
          {/* Active pill bg */}
          {isActive && (
            <motion.div
              layoutId="bottomnav-pill"
              className="bottom-nav-active-pill absolute inset-x-0 top-0 bottom-0 rounded-2xl bg-accent-primary/12"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          <item.icon
            className={`w-[22px] h-[22px] transition-colors duration-200 relative z-10 ${isActive ? 'text-accent-primary' : 'text-text-tertiary'
              }`}
          />
          <span
            className={`text-[11px] font-semibold tracking-wide relative z-10 transition-colors duration-200 ${isActive ? 'text-accent-primary' : 'text-text-tertiary'
              }`}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}
