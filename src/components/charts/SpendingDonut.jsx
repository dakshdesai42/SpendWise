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
      icon: cat.icon,
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-tertiary text-sm">
        No spending data yet
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
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
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-xs text-text-tertiary">Total</p>
        <p className="text-xl font-bold text-text-primary">
          {formatCurrency(total || 0, curr)}
        </p>
      </div>
    </div>
  );
}
