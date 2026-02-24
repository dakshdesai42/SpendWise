import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { FABProvider, useFAB } from '../../context/FABContext';
import { useAuth } from '../../context/AuthContext';
import { useAutoBankSync } from '../../hooks/useAutoBankSync';
import { hapticLight } from '../../utils/haptics';

const TAB_ROUTES = ['/dashboard', '/expenses', '/budgets', '/settings'] as const;
const SWIPE_DISTANCE_THRESHOLD = 72;
const SWIPE_AXIS_RATIO = 1.2;
const SWIPE_COOLDOWN_MS = 450;

type SwipeState = {
  active: boolean;
  blocked: boolean;
  startX: number;
  startY: number;
  startTs: number;
};

function findTabIndex(pathname: string): number {
  return TAB_ROUTES.findIndex((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function hasHorizontalScrollableAncestor(node: HTMLElement): boolean {
  let cursor: HTMLElement | null = node;
  while (cursor && cursor !== document.body) {
    const style = window.getComputedStyle(cursor);
    const overflowX = style.overflowX;
    if ((overflowX === 'auto' || overflowX === 'scroll') && cursor.scrollWidth > cursor.clientWidth + 4) {
      return true;
    }
    cursor = cursor.parentElement;
  }
  return false;
}

function shouldIgnoreSwipeStart(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  if (document.documentElement.classList.contains('modal-open')) return true;
  const active = document.activeElement as HTMLElement | null;
  if (active && active.matches('input,textarea,select,[contenteditable="true"]')) return true;
  if (
    target.closest(
      'input,textarea,select,button,a,[contenteditable="true"],[data-disable-tab-swipe="true"]'
    )
  ) {
    return true;
  }
  return hasHorizontalScrollableAncestor(target);
}

function Layout() {
  const { triggerFAB } = useFAB();
  const { user, demoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const swipeStateRef = useRef<SwipeState>({
    active: false,
    blocked: false,
    startX: 0,
    startY: 0,
    startTs: 0,
  });
  const swipeCooldownUntilRef = useRef(0);
  const currentTabIndex = useMemo(() => findTabIndex(location.pathname), [location.pathname]);

  useAutoBankSync(user?.uid, demoMode);

  const handleAddExpense = useCallback(() => {
    const handled = triggerFAB();
    if (handled) return;
    navigate('/expenses', { state: { openAddExpense: true, source: 'fab' } });
  }, [navigate, triggerFAB]);

  useEffect(() => {
    const handleNativeAddExpense = () => handleAddExpense();
    window.addEventListener('spendwise-native-add-expense', handleNativeAddExpense);
    return () => {
      window.removeEventListener('spendwise-native-add-expense', handleNativeAddExpense);
    };
  }, [handleAddExpense]);

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    if (currentTabIndex < 0) return;
    if (swipeCooldownUntilRef.current > Date.now()) return;
    if (event.touches.length !== 1) return;
    if (shouldIgnoreSwipeStart(event.target)) return;

    const touch = event.touches[0];
    swipeStateRef.current = {
      active: true,
      blocked: false,
      startX: touch.clientX,
      startY: touch.clientY,
      startTs: Date.now(),
    };
  }

  function handleTouchMove(event: React.TouchEvent<HTMLElement>) {
    if (!swipeStateRef.current.active) return;
    if (event.touches.length !== 1) {
      swipeStateRef.current.active = false;
      return;
    }

    const touch = event.touches[0];
    const dx = touch.clientX - swipeStateRef.current.startX;
    const dy = touch.clientY - swipeStateRef.current.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDy > 20 && absDy > absDx) {
      swipeStateRef.current.blocked = true;
    }
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    if (!swipeStateRef.current.active) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - swipeStateRef.current.startX;
    const dy = touch.clientY - swipeStateRef.current.startY;
    const elapsedMs = Date.now() - swipeStateRef.current.startTs;
    const wasBlocked = swipeStateRef.current.blocked;
    swipeStateRef.current.active = false;

    if (wasBlocked || currentTabIndex < 0) return;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < SWIPE_DISTANCE_THRESHOLD) return;
    if (absDx < absDy * SWIPE_AXIS_RATIO) return;
    if (elapsedMs > 900) return;

    const direction = dx < 0 ? 1 : -1;
    const nextIndex = currentTabIndex + direction;
    if (nextIndex < 0 || nextIndex >= TAB_ROUTES.length) return;

    swipeCooldownUntilRef.current = Date.now() + SWIPE_COOLDOWN_MS;
    hapticLight();
    navigate(TAB_ROUTES[nextIndex]);
  }

  function handleTouchCancel() {
    swipeStateRef.current.active = false;
    swipeStateRef.current.blocked = false;
  }

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-black">
      <Sidebar />
      <div className="flex-1 relative w-full h-full [perspective:1000px]">
        <motion.main
          data-scroll-container="app-main"
          className="absolute inset-0 w-full h-full overflow-y-auto overscroll-y-contain origin-top bg-[#000000] rounded-[32px] transition-all duration-500 will-change-transform"
          style={{
            paddingTop: 'calc(var(--safe-area-top) + var(--app-shell-top-gap))',
            paddingLeft: 'var(--app-shell-horizontal-padding)',
            paddingRight: 'var(--app-shell-horizontal-padding)',
            WebkitOverflowScrolling: 'touch',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <div className="max-w-6xl mx-auto space-y-1 pb-24">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } }}
                className="w-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.main>
      </div>
      <BottomNav onAddExpense={handleAddExpense} />
    </div>
  );
}

export default function AppLayout() {
  return (
    <FABProvider>
      <Layout />
    </FABProvider>
  );
}
