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
    <header className="app-page-header flex items-start sm:items-center justify-between gap-4">
      <div>
        <motion.h2
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl lg:text-3xl font-semibold tracking-tighter text-text-primary"
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
