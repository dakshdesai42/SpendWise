import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { FABProvider, useFAB } from '../../context/FABContext';

function Layout() {
  const { triggerFAB } = useFAB();

  useEffect(() => {
    const handleNativeAddExpense = () => triggerFAB();
    window.addEventListener('spendwise-native-add-expense', handleNativeAddExpense);
    return () => {
      window.removeEventListener('spendwise-native-add-expense', handleNativeAddExpense);
    };
  }, [triggerFAB]);

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-bg-primary">
      <Sidebar />
      <main
        data-scroll-container="app-main"
        className="flex-1 overflow-y-auto overscroll-y-contain"
        style={{
          paddingTop: 'calc(var(--safe-area-top) + var(--app-shell-top-gap))',
          paddingLeft: 'var(--app-shell-horizontal-padding)',
          paddingRight: 'var(--app-shell-horizontal-padding)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="max-w-6xl mx-auto space-y-1">
          <Outlet />
        </div>
      </main>
      <BottomNav onAddExpense={triggerFAB} />
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
