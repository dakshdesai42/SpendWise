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
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-bg-secondary border-r border-white/[0.06] p-6">
      {/* Logo */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold gradient-text">SpendWise</h1>
        <p className="text-xs text-text-tertiary mt-1">Track smart, spend wise</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent-primary/15 text-accent-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-5 h-5" />
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
      <div className="pt-6 border-t border-white/[0.06]">
        <p className="text-xs text-text-tertiary text-center">
          Made for students abroad
        </p>
      </div>
    </aside>
  );
}
