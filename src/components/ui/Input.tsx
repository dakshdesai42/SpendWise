import clsx from 'clsx';
import { forwardRef, useId } from 'react';

const Input = forwardRef<HTMLInputElement, {
  label?: string;
  error?: string;
  className?: string;
  icon?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>>(function Input(
  { label, error, className, icon, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = props.id || generatedId;

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold tracking-wide text-text-secondary">
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
          id={inputId}
          aria-invalid={!!error}
          className={clsx(
            'w-full rounded-xl border border-white/[0.10] bg-white/[0.05]',
            'px-4 py-3 text-base md:text-sm text-text-primary placeholder:text-text-tertiary/85 min-h-11',
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
