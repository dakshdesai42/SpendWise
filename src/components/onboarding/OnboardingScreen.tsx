import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hapticLight, hapticSuccess } from '../../utils/haptics';

const ONBOARDING_KEY = 'sw_onboarding_complete';

const slides = [
    {
        emoji: '💸',
        title: 'Track Every Expense',
        description: 'Log expenses in seconds with smart categories and automatic currency conversion.',
        gradient: 'from-blue-500/20 to-cyan-500/20',
    },
    {
        emoji: '💱',
        title: 'Dual Currency Support',
        description: 'See spending in both your home and host currencies — perfect for studying abroad.',
        gradient: 'from-purple-500/20 to-pink-500/20',
    },
    {
        emoji: '📊',
        title: 'Smart Budgets & Goals',
        description: 'Set monthly budgets, track savings goals, and get weekly spending insights.',
        gradient: 'from-green-500/20 to-emerald-500/20',
    },
];

export function useOnboarding() {
    const [showOnboarding, setShowOnboarding] = useState(() => {
        try {
            return !localStorage.getItem(ONBOARDING_KEY);
        } catch {
            return false;
        }
    });

    const completeOnboarding = useCallback(() => {
        try {
            localStorage.setItem(ONBOARDING_KEY, 'true');
        } catch { /* noop */ }
        setShowOnboarding(false);
    }, []);

    return { showOnboarding, completeOnboarding };
}

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
    const [currentSlide, setCurrentSlide] = useState(0);

    function handleNext() {
        hapticLight();
        if (currentSlide < slides.length - 1) {
            setCurrentSlide((s) => s + 1);
        } else {
            hapticSuccess();
            onComplete();
        }
    }

    function handleSkip() {
        hapticLight();
        onComplete();
    }

    const slide = slides[currentSlide];
    const isLast = currentSlide === slides.length - 1;

    return (
        <motion.div
            className="flex flex-col min-h-[100dvh] w-full bg-bg-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
            {/* Skip button */}
            {!isLast && (
                <div className="absolute top-0 right-0 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] z-10">
                    <button
                        onClick={handleSkip}
                        className="text-sm font-medium text-text-tertiary hover:text-text-secondary transition-colors px-4 py-2"
                    >
                        Skip
                    </button>
                </div>
            )}

            {/* Slide content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -60 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="flex flex-col items-center text-center max-w-sm"
                    >
                        {/* Glowing emoji */}
                        <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${slide.gradient} flex items-center justify-center mb-8`}>
                            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${slide.gradient} blur-2xl opacity-60`} />
                            <span className="text-6xl relative z-10">{slide.emoji}</span>
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary mb-3">
                            {slide.title}
                        </h2>
                        <p className="text-base text-text-secondary leading-relaxed">
                            {slide.description}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom controls */}
            <div className="px-8 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">
                {/* Dots */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    {slides.map((_, i) => (
                        <motion.div
                            key={i}
                            className="h-2 rounded-full"
                            animate={{
                                width: i === currentSlide ? 24 : 8,
                                backgroundColor: i === currentSlide ? '#0A84FF' : 'rgba(255,255,255,0.2)',
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                    ))}
                </div>

                {/* Action button */}
                <motion.button
                    onClick={handleNext}
                    whileTap={{ scale: 0.96 }}
                    className="w-full py-4 rounded-2xl bg-accent-primary text-white font-semibold text-base shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_16px_rgba(10,132,255,0.35)] transition-colors"
                >
                    {isLast ? 'Get Started' : 'Continue'}
                </motion.button>
            </div>
        </motion.div>
    );
}
