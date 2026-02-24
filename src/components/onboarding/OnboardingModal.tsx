import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCreditCard, HiChartPie, HiDocumentArrowUp } from 'react-icons/hi2';
import { hapticLight, hapticSuccess } from '../../utils/haptics';

const SCREENS = [
  {
    icon: HiCreditCard,
    color: '#2D8CFF',
    title: 'Track Every Expense',
    description: 'Log spending in seconds with smart categories, multi-currency support, and recurring bill tracking.',
  },
  {
    icon: HiChartPie,
    color: '#BF5AF2',
    title: 'Budgets & Goals',
    description: 'Set monthly budgets, track your progress, and save toward goals that matter to you.',
  },
  {
    icon: HiDocumentArrowUp,
    color: '#32D74B',
    title: 'Import & Analyze',
    description: 'Import bank statements, view spending trends, and get insights that help you spend smarter.',
  },
];

export default function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);

  const isLastScreen = currentScreen === SCREENS.length - 1;

  const goNext = useCallback(() => {
    if (isLastScreen) {
      hapticSuccess();
      onComplete();
      return;
    }
    hapticLight();
    setDirection(1);
    setCurrentScreen((prev) => prev + 1);
  }, [isLastScreen, onComplete]);

  const goBack = useCallback(() => {
    if (currentScreen === 0) return;
    hapticLight();
    setDirection(-1);
    setCurrentScreen((prev) => prev - 1);
  }, [currentScreen]);

  const screen = SCREENS[currentScreen];

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Sheet */}
      <motion.div
        className="relative w-full max-w-md rounded-t-[32px] border border-white/[0.04] bg-[#121214] shadow-[0_-8px_40px_rgba(0,0,0,0.8)] overflow-hidden"
        style={{ maxHeight: 'calc(100dvh - var(--safe-area-top) - 1rem)', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        initial={{ y: '100%' }}
        animate={{ y: 0, transition: { type: 'spring', stiffness: 400, damping: 38, mass: 0.8 } }}
        exit={{ y: '100%', transition: { duration: 0.22, ease: 'easeIn' } }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Screen content */}
        <div className="px-8 pt-8 pb-6 min-h-[340px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentScreen}
              custom={direction}
              initial={(dir) => ({ opacity: 0, x: dir > 0 ? 60 : -60 })}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.22, 0.8, 0.24, 1] } }}
              exit={(dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40, transition: { duration: 0.15, ease: 'easeIn' } })}
              className="flex flex-col items-center text-center"
            >
              {/* Icon */}
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
                style={{ backgroundColor: `${screen.color}15`, border: `1px solid ${screen.color}25` }}
              >
                <screen.icon className="w-10 h-10" style={{ color: screen.color }} />
              </div>

              <h2 className="text-[22px] font-bold text-white mb-3 tracking-tight">{screen.title}</h2>
              <p className="text-[15px] text-white/50 leading-relaxed max-w-[280px]">{screen.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-6">
          {SCREENS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === currentScreen ? 24 : 6,
                backgroundColor: i === currentScreen ? '#2D8CFF' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="px-8 flex gap-3">
          {currentScreen > 0 && (
            <button
              onClick={goBack}
              className="flex-1 py-3.5 rounded-full text-[15px] font-semibold text-white/60 bg-white/[0.06] border border-white/[0.06] active:scale-[0.98] transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={goNext}
            className="flex-1 py-3.5 rounded-full text-[15px] font-semibold text-white bg-[#2D8CFF] shadow-[0_4px_24px_-4px_rgba(45,140,255,0.5)] active:scale-[0.98] transition-all"
          >
            {isLastScreen ? 'Get Started' : 'Next'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
