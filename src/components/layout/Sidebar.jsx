import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiHome,
  HiCreditCard,
  HiChartPie,
  HiCog6Tooth,
} from 'react-icons/hi2';

const navItems = [
  { to: '/dashboard', icon: HiHome, label: 'Dashboard' },
  { to: '/expenses', icon: HiCreditCard, label: 'Expenses' },
  { to: '/budgets', icon: HiChartPie, label: 'Budgets' },
  { to: '/settings', icon: HiCog6Tooth, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-72 min-h-screen bg-bg-secondary border-r border-white/[0.10] px-6 py-7">
      {/* Logo */}
      <div className="mb-9">
        <h1 className="text-[1.7rem] font-bold tracking-tight gradient-text">SpendWise</h1>
        <p className="text-xs text-text-secondary mt-1.5">Track smart, spend wise</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent-primary/14 text-accent-primary border border-accent-primary/20'
                  : 'text-text-secondary border border-transparent hover:text-text-primary hover:bg-white/[0.06]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5" />
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-primary"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="pt-6 border-t border-white/[0.10]">
        <p className="text-xs text-text-secondary text-center">
          Made for students abroad
        </p>
      </div>
    </aside>
  );
}
