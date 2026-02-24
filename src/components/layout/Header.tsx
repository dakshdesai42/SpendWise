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
    <header
      // Negative margins pull it out of the layout padding to touch the edges, 
      // but we wrap the content so it stays aligned with the grid
      className="sticky top-0 z-30 bg-[#121214]/80 backdrop-blur-3xl border-b border-light-divider mb-6 shadow-sm"
      style={{
        paddingTop: 'calc(max(1rem, var(--safe-area-top)) + 0.5rem)',
        marginInline: 'calc(var(--app-shell-horizontal-padding) * -1)',
        paddingBottom: '1rem',
        paddingInline: 'var(--app-shell-horizontal-padding)',
        // Negative top margin pulls it flush against the top of the scroll container
        marginTop: 'calc((var(--safe-area-top) + var(--app-shell-top-gap)) * -1)'
      }}
    >
      <div className="flex items-start sm:items-center justify-between gap-4">
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
      </div>
    </header>
  );
}
