import { motion } from 'framer-motion';
import Button from './Button';

export default function EmptyState({ icon, title, description, actionLabel, onAction }: { icon?: React.ReactNode; title: string; description?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {icon && (
        <span className="text-5xl mb-4 block">{icon}</span>
      )}
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-text-tertiary max-w-sm mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </motion.div>
  );
}
