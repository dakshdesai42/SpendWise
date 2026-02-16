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

function CustomTooltip({ active, payload, label, currency }) {
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

export default function MonthlyTrend({ data }) {
  const { hostCurrency } = useCurrency();

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-tertiary text-sm">
        Not enough data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 22, right: 16, left: -12, bottom: 4 }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#7f8da6', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#7f8da6', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip content={<CustomTooltip currency={hostCurrency} />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#8b5cf6"
          strokeWidth={3}
          fill="url(#trendGradient)"
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
