import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCY_MAP } from '../../utils/constants';
import { TrendDataPoint } from '../../types/models';

function CustomTooltip({ active, payload, label, currency }: { active?: boolean; payload?: Array<{ value: number }>; label?: string; currency: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-text-tertiary mb-1">{label}</p>
      <p className="text-sm font-semibold text-text-primary">
        {formatCurrency(payload[0].value, currency)}
      </p>
    </div>
  );
}

export default function MonthlyTrend({ data }: { data: TrendDataPoint[] }) {
  const { hostCurrency } = useCurrency();
  const currencySymbol = CURRENCY_MAP[hostCurrency]?.symbol || hostCurrency;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-tertiary text-sm">
        Not enough data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0A84FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${currencySymbol}${v}`}
        />
        <Tooltip content={<CustomTooltip currency={hostCurrency} />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#0A84FF"
          strokeWidth={2.5}
          fill="url(#trendGradient)"
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
