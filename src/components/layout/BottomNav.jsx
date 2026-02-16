import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiHome,
  HiCreditCard,
  HiChartPie,
  HiCog6Tooth,
} from 'react-icons/hi2';

const navItems = [
  { to: '/dashboard', icon: HiHome, label: 'Home' },
  { to: '/expenses', icon: HiCreditCard, label: 'Expenses' },
  { to: '/budgets', icon: HiChartPie, label: 'Budgets' },
  { to: '/settings', icon: HiCog6Tooth, label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary/95 backdrop-blur-xl border-t border-white/[0.10] px-2 pb-safe">
      <div className="flex items-center justify-around h-[4.4rem]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-accent-primary bg-accent-primary/12'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {isActive && (
                    <motion.div
                      layoutId="bottomnav-indicator"
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-primary"
                    />
                  )}
                </div>
                <span className="text-[11px] font-medium tracking-wide">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
