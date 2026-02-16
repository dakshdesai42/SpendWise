import clsx from 'clsx';
import { forwardRef } from 'react';

const Select = forwardRef(function Select(
  { label, error, options, className, placeholder, ...props },
  ref
) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'w-full rounded-xl border border-white/[0.08] bg-white/[0.04]',
          'px-4 py-2.5 text-sm text-text-primary',
          'focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20',
          'transition-all duration-200 appearance-none',
          'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")]',
          'bg-[position:right_12px_center] bg-no-repeat',
          error && 'border-danger/50',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" className="bg-bg-primary">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-bg-primary">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
});

export default Select;
