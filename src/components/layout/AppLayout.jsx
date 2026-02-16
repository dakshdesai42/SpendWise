import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />
      <main className="flex-1 px-4 md:px-6 lg:px-8 py-5 lg:py-8 pb-24 lg:pb-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-1">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
