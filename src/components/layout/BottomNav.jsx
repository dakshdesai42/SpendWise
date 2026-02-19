import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
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

export default function BottomNav({ onAddExpense }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary/95 backdrop-blur-xl border-t border-white/[0.08]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center h-[4.25rem] px-2">
        {/* Left side */}
        <div className="flex flex-1 justify-around">
          {leftItems.map((item) => (
            <NavTabItem key={item.to} item={item} />
          ))}
        </div>

        {/* Center FAB */}
        <div className="flex items-center justify-center px-3">
          <motion.button
            onClick={onAddExpense}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-accent-primary/30 -mt-6"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
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

function NavTabItem({ item }) {
  return (
    <NavLink
      to={item.to}
      className="flex flex-col items-center justify-center gap-1 w-14 py-1.5 relative"
    >
      {({ isActive }) => (
        <>
          {/* Active pill bg */}
          {isActive && (
            <motion.div
              layoutId="bottomnav-pill"
              className="absolute inset-x-0 top-0 bottom-0 rounded-2xl bg-accent-primary/12"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          <item.icon
            className={`w-[22px] h-[22px] transition-colors duration-200 relative z-10 ${
              isActive ? 'text-accent-primary' : 'text-text-tertiary'
            }`}
          />
          <span
            className={`text-[10px] font-semibold tracking-wide relative z-10 transition-colors duration-200 ${
              isActive ? 'text-accent-primary' : 'text-text-tertiary'
            }`}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}
