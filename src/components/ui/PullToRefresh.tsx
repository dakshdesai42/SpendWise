import { useState, useRef, ReactNode, useEffect, useCallback } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { HiArrowPath } from 'react-icons/hi2';
import { hapticMedium, hapticSuccess } from '../../utils/haptics';

export default function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void>; children: ReactNode }) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const ySpring = useSpring(0, { stiffness: 400, damping: 30, mass: 0.8 });
    const startY = useRef(0);
    const currentY = useRef(0);
    const pastThreshold = useRef(false);
    const isPullingRef = useRef(false);
    const isRefreshingRef = useRef(false);
    const scrollContainerRef = useRef<HTMLElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const pendingPullRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const THRESHOLD = 80;

    const spinnerY = useTransform(ySpring, [0, THRESHOLD], [-40, 20]);
    const spinnerRotate = useTransform(ySpring, [0, THRESHOLD], [0, 180]);
    const spinnerOpacity = useTransform(ySpring, [0, THRESHOLD * 0.5, THRESHOLD], [0, 0.5, 1]);

    // Keep ref in sync with state for use in native event handlers
    useEffect(() => {
        isRefreshingRef.current = isRefreshing;
    }, [isRefreshing]);

    useEffect(() => {
        return () => {
            if (rafRef.current) {
                window.cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, []);

    const schedulePullUpdate = useCallback((pull: number) => {
        pendingPullRef.current = pull;
        if (rafRef.current !== null) return;
        rafRef.current = window.requestAnimationFrame(() => {
            rafRef.current = null;
            if (pendingPullRef.current !== null) {
                ySpring.set(pendingPullRef.current);
                pendingPullRef.current = null;
            }
        });
    }, [ySpring]);

    const getScrollContainer = useCallback(() => {
        if (!scrollContainerRef.current) {
            scrollContainerRef.current = document.querySelector('[data-scroll-container="app-main"]') as HTMLElement | null;
        }
        return scrollContainerRef.current;
    }, []);

    // Use native event listeners for passive/non-passive control
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleTouchStart = (e: TouchEvent) => {
            scrollContainerRef.current = null;
            const scrollContainer = getScrollContainer();
            if (scrollContainer && scrollContainer.scrollTop > 0) return;

            startY.current = e.touches[0].clientY;
            currentY.current = e.touches[0].clientY;
            pastThreshold.current = false;
            isPullingRef.current = true;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPullingRef.current || isRefreshingRef.current) return;

            const scrollContainer = getScrollContainer();
            if (scrollContainer && scrollContainer.scrollTop > 0) return;

            currentY.current = e.touches[0].clientY;
            const deltaY = currentY.current - startY.current;

            // Only pull down
            if (deltaY > 0) {
                if (e.cancelable) e.preventDefault(); // Prevent native scroll bounce
                const pull = deltaY * 0.4;
                schedulePullUpdate(pull);

                if (pull >= THRESHOLD && !pastThreshold.current) {
                    pastThreshold.current = true;
                    hapticMedium();
                } else if (pull < THRESHOLD && pastThreshold.current) {
                    pastThreshold.current = false;
                }
            }
        };

        const handleTouchEnd = async () => {
            if (!isPullingRef.current) return;
            isPullingRef.current = false;

            const pull = ySpring.get();
            if (pull >= THRESHOLD) {
                setIsRefreshing(true);
                schedulePullUpdate(60); // Hold at spinner height

                try {
                    await onRefresh();
                    hapticSuccess();
                } finally {
                    setIsRefreshing(false);
                    schedulePullUpdate(0);
                }
            } else {
                schedulePullUpdate(0); // Snap back
            }
        };

        // touchstart and touchend are passive (don't block scrolling)
        // touchmove is non-passive because we call preventDefault to block bounce
        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onRefresh, ySpring, getScrollContainer, schedulePullUpdate]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full min-h-screen"
        >
            <motion.div
                className="absolute left-0 right-0 flex justify-center -z-10 pointer-events-none"
                style={{ y: spinnerY, opacity: spinnerOpacity }}
            >
                <motion.div
                    className="text-white bg-[#2C2C2E] p-2 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
                    style={!isRefreshing ? { rotate: spinnerRotate } : {}}
                    animate={isRefreshing ? { rotate: 360 } : {}}
                    transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
                >
                    <HiArrowPath className="w-5 h-5 text-[#34C759]" />
                </motion.div>
            </motion.div>
            <motion.div style={{ y: ySpring }} className="bg-transparent h-full w-full">
                {children}
            </motion.div>
        </div>
    );
}
