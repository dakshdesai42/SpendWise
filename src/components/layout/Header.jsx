import { useState } from 'react';
import { motion } from 'framer-motion';
import { HiPlus } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

export default function Header({ onAddExpense }) {
  const { profile } = useAuth();
  const firstName = profile?.displayName?.split(' ')[0] || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="flex items-center justify-between py-4 px-4 lg:px-0">
      <div>
        <motion.h2
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl lg:text-2xl font-bold text-text-primary"
        >
          {getGreeting()}, {firstName}
        </motion.h2>
        <p className="text-sm text-text-tertiary mt-0.5">
          Here's your spending overview
        </p>
      </div>

      {onAddExpense && (
        <Button onClick={onAddExpense} icon={<HiPlus className="w-4 h-4" />}>
          Add Expense
        </Button>
      )}
    </header>
  );
}
