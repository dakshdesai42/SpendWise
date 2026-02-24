import { motion } from 'framer-motion';
import Button from './Button';

export default function EmptyState({ icon, title, description, actionLabel, onAction }: { icon?: React.ReactNode; title: string; description?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col items-center justify-center py-20 px-6 text-center overflow-hidden min-h-[50vh] rounded-[32px]"
    >
      {/* Cinematic Background Blur */}
      {icon && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <span className="text-[240px] leading-none blur-[4px]">{icon}</span>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center">
        {icon && (
          <div className="w-20 h-20 bg-[#18181A] border border-white/[0.08] rounded-[24px] shadow-[0_16px_32px_rgba(0,0,0,0.8)] flex items-center justify-center text-4xl mb-6">
            <span className="drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{icon}</span>
          </div>
        )}
        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{title}</h3>
        {description && (
          <p className="text-[15px] font-medium text-white/50 max-w-[280px] mb-8 leading-relaxed">{description}</p>
        )}
        {actionLabel && onAction && (
          <Button onClick={onAction} size="lg" className="w-[200px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_24px_rgba(10,132,255,0.4)]">
            {actionLabel}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
