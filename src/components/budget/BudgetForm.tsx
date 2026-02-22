import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { CATEGORIES } from '../../utils/constants';
import { useCurrency } from '../../context/CurrencyContext';

export default function BudgetForm({ isOpen, onClose, onSubmit, initialData }: { isOpen: boolean; onClose: () => void; onSubmit: (data: { overall: number; categories: Record<string, number>; currency: string }) => Promise<void>; initialData?: { overall?: number; categories?: Record<string, number> } | null }) {
  const { hostCurrency } = useCurrency();
  const [overall, setOverall] = useState(initialData?.overall?.toString() || '');
  const [categories, setCategories] = useState<Record<string, number>>(
    initialData?.categories || {}
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setOverall(initialData?.overall?.toString() || '');
    setCategories(initialData?.categories ? { ...initialData.categories } : {});
  }, [isOpen]);

  function updateCategory(catId: string, value: string) {
    setCategories((prev) => ({
      ...prev,
      [catId]: parseFloat(value) || 0,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const overallNum = parseFloat(overall);
    if (!overall || !overallNum || overallNum <= 0) return;

    setLoading(true);
    try {
      await onSubmit({
        overall: overallNum,
        categories,
        currency: hostCurrency,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Monthly Budget" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label={`Overall Monthly Budget (${hostCurrency})`}
          type="number"
          step="1"
          min="0"
          value={overall}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOverall(e.target.value)}
          placeholder="e.g., 2000"
        />

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Category Budgets (optional)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <span className="text-base">{cat.icon}</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={categories[cat.id] || ''}
                  onChange={(e) => updateCategory(cat.id, e.target.value)}
                  placeholder={cat.label}
                  className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading} disabled={!overall || parseFloat(overall) <= 0}>
          Save Budget
        </Button>
      </form>
    </Modal>
  );
}
