import clsx from 'clsx';
import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, className, icon, ...props },
  ref
) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full rounded-xl border border-white/[0.08] bg-white/[0.04]',
            'px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary',
            'focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20',
            'transition-all duration-200',
            icon && 'pl-10',
            error && 'border-danger/50 focus:border-danger/50 focus:ring-danger/20',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

export default Input;
