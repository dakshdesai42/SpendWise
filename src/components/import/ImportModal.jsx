import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { CATEGORY_MAP, CATEGORIES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { extractTextFromPDF, parseWithAI } from '../../services/statementParser';
import { bulkAddExpenses } from '../../services/expenses';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function ImportModal({ isOpen, onClose, onImported }) {
  const { user } = useAuth();
  const { hostCurrency, homeCurrency, convertToHome, getRate } = useCurrency();
  const [step, setStep] = useState('upload'); // upload | processing | review
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);

  function reset() {
    setStep('upload');
    setTransactions([]);
    setSelected(new Set());
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    setStep('processing');
    try {
      const text = await extractTextFromPDF(file);
      if (!text.trim()) {
        toast.error('Could not extract text from PDF');
        setStep('upload');
        return;
      }
      const parsed = await parseWithAI(text, hostCurrency);
      if (parsed.length === 0) {
        toast.error('No transactions found in this statement');
        setStep('upload');
        return;
      }
      setTransactions(parsed);
      setSelected(new Set(parsed.map((_, i) => i)));
      setStep('review');
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to parse statement');
      setStep('upload');
    }
  }

  function toggleTransaction(index) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function updateCategory(index, category) {
    setTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, category } : t))
    );
  }

  async function handleImport() {
    const toImport = transactions
      .filter((_, i) => selected.has(i))
      .map((t) => {
        const rate = getRate(hostCurrency, homeCurrency);
        return {
          amount: t.amount,
          amountHome: convertToHome(t.amount),
          exchangeRate: rate,
          category: t.category,
          note: t.note,
          date: t.date,
        };
      });

    if (toImport.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    setImporting(true);
    try {
      await bulkAddExpenses(user.uid, toImport);
      toast.success(`Imported ${toImport.length} expenses!`);
      handleClose();
      onImported?.();
    } catch (err) {
      toast.error('Failed to import expenses');
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Bank Statement" size="2xl">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8"
          >
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/[0.1] rounded-2xl p-12 cursor-pointer hover:border-accent-primary/30 hover:bg-accent-primary/5 transition-all group">
              <span className="text-4xl mb-3">📄</span>
              <p className="text-sm font-medium text-text-primary mb-1">
                Upload your bank statement
              </p>
              <p className="text-xs text-text-tertiary mb-4">
                PDF format — we'll extract and categorize transactions automatically
              </p>
              <span className="text-xs font-medium text-accent-primary group-hover:underline">
                Choose file
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-text-tertiary text-center mt-3">
              Your file is processed locally in your browser. Nothing is uploaded to our servers.
            </p>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <LoadingSpinner size="lg" />
            <p className="text-sm text-text-secondary mt-4">Analyzing your statement...</p>
            <p className="text-xs text-text-tertiary mt-1">This may take a few seconds</p>
          </motion.div>
        )}

        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Found <span className="text-text-primary font-medium">{transactions.length}</span> transactions
                ({selected.size} selected)
              </p>
              <button
                onClick={() =>
                  setSelected(
                    selected.size === transactions.length
                      ? new Set()
                      : new Set(transactions.map((_, i) => i))
                  )
                }
                className="text-xs text-accent-primary hover:underline"
              >
                {selected.size === transactions.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
              {transactions.map((t, i) => {
                const cat = CATEGORY_MAP[t.category] || CATEGORY_MAP.other;
                return (
                  <div
                    key={i}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                      selected.has(i)
                        ? 'border-white/[0.08] bg-white/[0.03]'
                        : 'border-transparent opacity-40'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleTransaction(i)}
                      className="shrink-0 w-4 h-4 rounded accent-accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{t.note}</p>
                      <p className="text-xs text-text-tertiary">{t.date}</p>
                    </div>
                    <select
                      value={t.category}
                      onChange={(e) => updateCategory(i, e.target.value)}
                      className="text-xs rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-text-primary shrink-0"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id} className="bg-bg-primary">
                          {c.icon} {c.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm font-medium text-text-primary shrink-0">
                      {formatCurrency(t.amount, hostCurrency)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleImport}
                loading={importing}
                disabled={selected.size === 0}
              >
                Import {selected.size} Expenses
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
