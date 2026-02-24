import clsx from 'clsx';
import { forwardRef } from 'react';

const Select = forwardRef<HTMLSelectElement, {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  className?: string;
  placeholder?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'>>(function Select(
  { label, error, options, className, placeholder, ...props },
  ref
) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold tracking-wide text-text-secondary">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'w-full rounded-[20px] border border-white/[0.06] bg-[#18181A]',
          'px-5 py-4 text-[15px] text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
          'focus:border-[#2D8CFF]/50 focus:ring-2 focus:ring-[#2D8CFF]/20',
          'focus-visible:outline-none',
          'transition-all duration-300 appearance-none',
          'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-opacity%3D%220.5%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")]',
          'bg-[position:right_16px_center] bg-no-repeat',
          error && 'border-[#FF453A]/50',
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
