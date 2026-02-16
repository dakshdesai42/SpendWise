import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORY_MAP, CATEGORIES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { useCurrency } from '../../context/CurrencyContext';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, color } = payload[0].payload;
  return (
    <div className="glass rounded-lg px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium text-text-primary">{name}</span>
      </div>
      <p className="text-sm font-semibold text-text-primary mt-1">{value}</p>
    </div>
  );
}

export default function SpendingDonut({ categoryTotals, total, currency }) {
  const { hostCurrency } = useCurrency();
  const curr = currency || hostCurrency;

  const data = CATEGORIES
    .filter((cat) => categoryTotals?.[cat.id] > 0)
    .map((cat) => ({
      name: cat.label,
      rawValue: categoryTotals[cat.id],
      value: formatCurrency(categoryTotals[cat.id], curr),
      color: cat.color,
      percentage: total > 0 ? (categoryTotals[cat.id] / total) * 100 : 0,
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-tertiary text-sm">
        No spending data yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_220px] gap-2 xl:gap-4 items-center">
      <div className="relative">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={108}
              paddingAngle={2}
              dataKey="rawValue"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[11px] tracking-wide font-semibold text-text-secondary">Total spent</p>
          <p className="text-lg font-bold text-text-primary">
            {formatCurrency(total || 0, curr)}
          </p>
        </div>
      </div>

      <div className="space-y-2 px-2 xl:px-0">
        {data.slice(0, 6).map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-text-secondary truncate">{entry.name}</span>
            </div>
            <span className="text-xs font-semibold text-text-primary shrink-0">
              {Math.round(entry.percentage)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
