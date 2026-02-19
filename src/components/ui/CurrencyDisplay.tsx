import { useCurrency } from '../../context/CurrencyContext';
import { formatCurrency } from '../../utils/formatters';

export default function CurrencyDisplay({
  amount,
  currency,
  showHome = true,
  size = 'md',
  className = '',
}: {
  amount: number;
  currency?: string;
  showHome?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const { hostCurrency, homeCurrency, convertToHome } = useCurrency();
  const displayCurrency = currency || hostCurrency;
  const homeAmount = convertToHome(amount);

  const sizeClasses = {
    sm: { primary: 'text-sm font-medium', secondary: 'text-xs' },
    md: { primary: 'text-lg font-semibold', secondary: 'text-sm' },
    lg: { primary: 'text-2xl font-bold', secondary: 'text-base' },
    xl: { primary: 'text-3xl font-bold', secondary: 'text-lg' },
  };

  const styles = sizeClasses[size];

  return (
    <div className={className}>
      <div className={`${styles.primary} text-text-primary`}>
        {formatCurrency(amount, displayCurrency)}
      </div>
      {showHome && displayCurrency !== homeCurrency && (
        <div className={`${styles.secondary} text-text-tertiary`}>
          ~{formatCurrency(homeAmount, homeCurrency)}
        </div>
      )}
    </div>
  );
}
