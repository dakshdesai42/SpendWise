import { Toaster, resolveValue } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCheckCircle, HiXCircle, HiInformationCircle } from 'react-icons/hi2';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { useEffect, useRef } from 'react';

function ToastItem({ t }: { t: any }) {
    const lastHapticKeyRef = useRef<string>('');

    useEffect(() => {
        if (!t.visible) return;
        const key = `${t.id}:${t.type}`;
        if (lastHapticKeyRef.current === key) return;
        lastHapticKeyRef.current = key;

        if (t.type === 'error') hapticMedium();
        else hapticLight();
    }, [t.id, t.type, t.visible]);

    const Icon = t.type === 'success'
        ? HiCheckCircle
        : t.type === 'error'
            ? HiXCircle
            : HiInformationCircle;

    const colors = t.type === 'success'
        ? 'text-[#32D74B] shadow-[0_0_12px_rgba(50,215,75,0.4)]'
        : t.type === 'error'
            ? 'text-[#FF453A] shadow-[0_0_12px_rgba(255,69,58,0.4)]'
            : 'text-[#0A84FF] shadow-[0_0_12px_rgba(10,132,255,0.4)]';

    return (
        <AnimatePresence>
            {t.visible && (
                <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: -40, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.8, y: -20, filter: 'blur(10px)' }}
                    transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                        mass: 0.8,
                    }}
                    className="mt-safe bg-[#121214]/90 backdrop-blur-2xl border border-white/[0.08] pointer-events-auto rounded-full px-4 py-2.5 shadow-[0_16px_32px_rgba(0,0,0,0.8)] flex items-center justify-center gap-3 min-w-[120px]"
                    {...t.ariaProps}
                >
                    <div className={`shrink-0 rounded-full ${colors} bg-[#1C1C1E]`}>
                        <Icon className="w-5 h-5 drop-shadow-[0_0_8px_currentColor]" />
                    </div>
                    <p className="text-[14px] font-medium text-white tracking-tight pr-1">
                        {resolveValue(t.message, t)}
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default function DynamicToaster() {
    return (
        <Toaster position="top-center">
            {(t) => <ToastItem t={t} />}
        </Toaster>
    );
}
