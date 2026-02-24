import { motion } from 'framer-motion';
import { HiPlus } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

export default function Header({ onAddExpense }: { onAddExpense?: () => void }) {
  const { profile } = useAuth();
  const firstName = profile?.displayName?.split(' ')[0] || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="sticky top-0 z-30 bg-[#121214]/70 backdrop-blur-3xl border-b border-white/[0.04] -mx-4 px-4 py-4 mb-6 flex items-start sm:items-center justify-between gap-4" style={{ paddingTop: 'max(1rem, var(--safe-area-top))' }}>
      <div>
        <motion.h2
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl lg:text-4xl font-bold tracking-tighter text-white"
        >
          {getGreeting()}, {firstName}
        </motion.h2>
        <p className="text-sm text-text-secondary mt-1">
          Here's your spending overview
        </p>
      </div>

      {/* Only show the Add button on desktop — mobile uses the FAB */}
      {onAddExpense && (
        <Button
          onClick={onAddExpense}
          size="sm"
          icon={<HiPlus className="w-4 h-4" />}
          className="hidden lg:flex"
        >
          Add Expense
        </Button>
      )}
    </header>
  );
}
