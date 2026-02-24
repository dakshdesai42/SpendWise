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
    <div className="bg-[#121214]/90 backdrop-blur-xl border border-white/[0.1] rounded-2xl px-4 py-3 shadow-[0_16px_32px_rgba(0,0,0,0.8),0_0_16px_rgba(45,140,255,0.2)]">
      <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-[20px] font-light tracking-tighter text-white">
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
      <AreaChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D8CFF" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#2D8CFF" stopOpacity={0} />
          </linearGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#2D8CFF" floodOpacity="0.6" />
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#2D8CFF" floodOpacity="0.8" />
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickMargin={12}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${currencySymbol}${v}`}
          tickMargin={12}
        />
        <Tooltip
          content={<CustomTooltip currency={hostCurrency} />}
          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#2D8CFF"
          strokeWidth={4}
          fill="url(#trendGradient)"
          activeDot={{ r: 6, fill: '#fff', stroke: '#2D8CFF', strokeWidth: 3, filter: 'url(#neonGlow)' }}
          filter="url(#neonGlow)"
          animationDuration={1500}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
