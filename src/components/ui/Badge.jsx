import clsx from 'clsx';

export default function Badge({ children, color, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
        className
      )}
      style={{
        backgroundColor: color ? `${color}20` : 'rgba(255,255,255,0.06)',
        color: color || 'var(--color-text-secondary)',
      }}
    >
      {children}
    </span>
  );
}
