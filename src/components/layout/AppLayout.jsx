import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { FABProvider, useFAB } from '../../context/FABContext';

function Layout() {
  const { triggerFAB } = useFAB();

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />
      <main className="flex-1 px-5 md:px-8 lg:px-12 py-6 lg:py-10 pb-32 lg:pb-10 overflow-y-auto">
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
