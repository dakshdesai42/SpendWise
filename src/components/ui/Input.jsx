import clsx from 'clsx';
import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, className, icon, ...props },
  ref
) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold tracking-wide text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full rounded-xl border border-white/[0.10] bg-white/[0.05]',
            'px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary/85',
            'focus:border-accent-primary/55 focus:ring-2 focus:ring-accent-primary/20',
            'focus-visible:outline-none',
            'transition-all duration-200',
            icon && 'pl-11',
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
