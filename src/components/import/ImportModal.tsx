import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { CATEGORIES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import {
  extractTextFromPDF,
  parseWithAI,
  parseCSV,
  buildFingerprint,
} from '../../services/statementParser';
import { bulkAddExpenses, getExpensesInRange } from '../../services/expenses';
import clsx from 'clsx';
import { ParsedTransaction, ProcessingFile } from '../../types/models';
import toast from 'react-hot-toast';

// ─── Inline-editable cell ────────────────────────────────────────────────────
function EditableCell({ value, onChange, type = 'text', className = '' }: { value: string; onChange: (val: string) => void; type?: string; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className={clsx(
          'bg-white/[0.08] border border-accent-primary/40 rounded px-1.5 py-0.5 text-text-primary outline-none w-full',
          className
        )}
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      title="Click to edit"
      className={clsx(
        'text-left hover:text-accent-primary transition-colors cursor-text underline decoration-dotted underline-offset-2 decoration-white/20',
        className
      )}
    >
      {value}
    </button>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDateRange(transactions: ParsedTransaction[]) {
  if (!transactions.length) return null;
  const dates = transactions.map((t) => t.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first === last) return first;
  return `${first} → ${last}`;
}

async function processFile(file: File, hostCurrency: string) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    const text = await extractTextFromPDF(file);
    if (!text.trim()) throw new Error('Could not extract text from PDF');
    return parseWithAI(text, hostCurrency);
  }
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = await file.text();
    return parseCSV(text);
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}

function mergeAndDeduplicate(allTransactions: ParsedTransaction[]): (ParsedTransaction & { isDuplicate?: boolean })[] {
  const seen = new Set();
  const merged = [];
  for (const t of allTransactions) {
    const fp = t.fingerprint || buildFingerprint(t.date, t.amount, t.note || '');
    if (!seen.has(fp)) {
      seen.add(fp);
      merged.push({ ...t, fingerprint: fp });
    }
  }
  return merged;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ImportModal({ isOpen, onClose, onImported }: { isOpen: boolean; onClose: () => void; onImported?: () => void }) {
  const { user } = useAuth();
  const { hostCurrency, homeCurrency, convertToHome, getRate } = useCurrency();

  const [step, setStep] = useState('upload'); // upload | processing | review
  const [transactions, setTransactions] = useState<(ParsedTransaction & { isDuplicate?: boolean })[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  // {name, status: 'pending'|'done'|'error', count}
  const [duplicateCount, setDuplicateCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Reset ────────────────────────────────────────────────────────────────
  function reset() {
    setStep('upload');
    setTransactions([]);
    setSelected(new Set());
    setProcessingFiles([]);
    setDuplicateCount(0);
    setDragOver(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // ── File processing ───────────────────────────────────────────────────────
  async function processFiles(files: FileList | File[]) {
    const validFiles = Array.from(files).filter((f) => {
      const n = f.name.toLowerCase();
      return n.endsWith('.pdf') || n.endsWith('.csv') || n.endsWith('.txt');
    });

    if (validFiles.length === 0) {
      toast.error('Please upload PDF or CSV files');
      return;
    }

    setStep('processing');
    setProcessingFiles(validFiles.map((f) => ({ name: f.name, status: 'pending', count: 0 })));

    const allParsed = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const parsed = await processFile(file, hostCurrency);
        allParsed.push(...parsed);
        setProcessingFiles((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: 'done', count: parsed.length } : p
          )
        );
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        setProcessingFiles((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error' } : p
          )
        );
      }
    }

    const merged = mergeAndDeduplicate(allParsed);

    if (merged.length === 0) {
      toast.error('No transactions found in the uploaded files');
      setStep('upload');
      return;
    }

    // ── Cross-check against existing Firestore expenses ────────────────────
    let existingFingerprints = new Set();
    try {
      const dates = merged.map((t) => t.date).sort();
      if (!user) return;
      const existing = await getExpensesInRange(user.uid, dates[0], dates[dates.length - 1]);
      existingFingerprints = new Set(
        existing
          .filter((e: any) => e.fingerprint)
          .map((e: any) => e.fingerprint)
      );
    } catch (_) {
      // non-fatal — dedup against Firestore is best-effort
    }

    const dupes = merged.filter((t) => existingFingerprints.has(t.fingerprint)).length;
    setDuplicateCount(dupes);

    // Pre-deselect known duplicates
    const finalTransactions = merged.map((t) => ({
      ...t,
      isDuplicate: existingFingerprints.has(t.fingerprint),
    }));

    setTransactions(finalTransactions);
    setSelected(
      new Set(
        finalTransactions
          .map((_, i) => i)
          .filter((i) => !finalTransactions[i].isDuplicate)
      )
    );
    setStep('review');
  }

  // ── Input / Drag handlers ─────────────────────────────────────────────────
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = ''; // allow re-selecting same file
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      processFiles(e.dataTransfer.files);
    },
    [hostCurrency]
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
  }

  // ── Review interactions ───────────────────────────────────────────────────
  function toggleTransaction(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  function updateField(index: number, field: string, value: string | number) {
    setTransactions((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t;
        const updated = { ...t, [field]: value };
        // Rebuild fingerprint if key fields changed
        if (['date', 'amount', 'note'].includes(field)) {
          updated.fingerprint = buildFingerprint(
            updated.date,
            Number(updated.amount) || 0,
            updated.note || ''
          );
        }
        return updated;
      })
    );
  }

  // ── Import ────────────────────────────────────────────────────────────────
  async function handleImport() {
    const toImport = transactions
      .filter((_, i) => selected.has(i))
      .map((t) => {
        const rate = getRate(hostCurrency, homeCurrency);
        const amt = Number(t.amount) || 0;
        return {
          amount: amt,
          amountHome: convertToHome(amt),
          exchangeRate: rate,
          category: t.category,
          note: t.note,
          date: t.date,
          fingerprint: t.fingerprint,
        };
      });

    if (toImport.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    setImporting(true);
    try {
      if (!user) return;
      await bulkAddExpenses(user.uid, toImport);
      toast.success(`Imported ${toImport.length} expense${toImport.length !== 1 ? 's' : ''}!`);
      handleClose();
      onImported?.();
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import expenses');
    } finally {
      setImporting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Bank Statement" size="2xl">
      <AnimatePresence mode="wait">

        {/* ── Upload step ─────────────────────────────────────────────────── */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="py-6"
          >
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all group select-none',
                dragOver
                  ? 'border-accent-primary/60 bg-accent-primary/10 scale-[1.01]'
                  : 'border-white/[0.1] hover:border-accent-primary/30 hover:bg-accent-primary/5'
              )}
            >
              <span className={clsx('text-5xl mb-4 transition-transform', dragOver && 'scale-110')}>
                {dragOver ? '📂' : '📄'}
              </span>
              <p className="text-sm font-semibold text-text-primary mb-1">
                {dragOver ? 'Drop files here' : 'Drag & drop your bank statements'}
              </p>
              <p className="text-xs text-text-tertiary mb-4 text-center">
                PDF or CSV — we'll extract and categorize transactions automatically
              </p>
              <span className="text-xs font-medium text-accent-primary group-hover:underline">
                or click to browse files
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {/* Format hints */}
            <div className="flex gap-3 mt-4">
              {[
                { icon: '📑', label: 'PDF', hint: 'Bank-generated statements' },
                { icon: '📊', label: 'CSV', hint: 'Excel / data exports' },
                { icon: '📦', label: 'Multiple files', hint: 'Import several months at once' },
              ].map(({ icon, label, hint }) => (
                <div
                  key={label}
                  className="flex-1 flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-[11px] font-medium text-text-primary">{label}</span>
                  <span className="text-[10px] text-text-tertiary text-center">{hint}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-text-tertiary text-center mt-4">
              🔒 Files are processed entirely in your browser — nothing is uploaded to our servers.
            </p>
          </motion.div>
        )}

        {/* ── Processing step ─────────────────────────────────────────────── */}
        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 gap-6"
          >
            <LoadingSpinner size="lg" />
            <div className="w-full max-w-xs space-y-2">
              {processingFiles.map((pf, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-base">
                    {pf.status === 'done' ? '✅' : pf.status === 'error' ? '❌' : '⏳'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary truncate">{pf.name}</p>
                    {pf.status === 'done' && (
                      <p className="text-[10px] text-text-tertiary">{pf.count} transactions found</p>
                    )}
                    {pf.status === 'error' && (
                      <p className="text-[10px] text-red-400">Could not parse this file</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-tertiary">
              {processingFiles.some((f) => f.status === 'pending')
                ? 'Analyzing with AI…'
                : 'Checking for duplicates…'}
            </p>
          </motion.div>
        )}

        {/* ── Review step ─────────────────────────────────────────────────── */}
        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <p className="text-sm text-text-secondary flex-1">
                <span className="text-text-primary font-semibold">{transactions.length}</span> transactions found
                {' · '}
                <span className="text-accent-primary font-medium">{selected.size} selected</span>
              </p>
              <button
                onClick={() =>
                  setSelected(
                    selected.size === transactions.filter((t) => !t.isDuplicate).length
                      ? new Set()
                      : new Set(
                        transactions
                          .map((_, i) => i)
                          .filter((i) => !transactions[i].isDuplicate)
                      )
                  )
                }
                className="text-xs text-accent-primary hover:underline shrink-0"
              >
                {selected.size > 0 ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {/* Date range + duplicate notice */}
            <div className="flex flex-wrap gap-2">
              {(() => {
                const range = formatDateRange(transactions);
                return range ? (
                  <span className="text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1 text-text-secondary">
                    📅 {range}
                  </span>
                ) : null;
              })()}
              {duplicateCount > 0 && (
                <span className="text-[11px] bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 text-amber-400">
                  ⚠️ {duplicateCount} likely duplicate{duplicateCount !== 1 ? 's' : ''} pre-deselected
                </span>
              )}
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 items-center px-3 pb-1 border-b border-white/[0.05]">
              <div />
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">Description</p>
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">Date</p>
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">Category</p>
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide text-right">Amount</p>
            </div>

            {/* Transaction rows */}
            <div className="max-h-72 overflow-y-auto space-y-0.5 pr-0.5 -mr-1">
              {transactions.map((t, i) => {
                const isSelected = selected.has(i);
                return (
                  <div
                    key={i}
                    className={clsx(
                      'grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 items-center px-3 py-2.5 rounded-xl border transition-all',
                      isSelected
                        ? 'border-white/[0.07] bg-white/[0.025]'
                        : 'border-transparent opacity-40',
                      t.isDuplicate && 'opacity-30'
                    )}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleTransaction(i)}
                      className="shrink-0 w-3.5 h-3.5 rounded accent-accent-primary cursor-pointer"
                    />

                    {/* Note — editable */}
                    <div className="min-w-0">
                      <EditableCell
                        value={t.note}
                        onChange={(v) => updateField(i, 'note', v)}
                        className="text-sm text-text-primary truncate block max-w-full"
                      />
                      {t.isDuplicate && (
                        <span className="text-[9px] text-amber-400/70">already imported</span>
                      )}
                    </div>

                    {/* Date — editable */}
                    <EditableCell
                      value={t.date}
                      onChange={(v) => updateField(i, 'date', v)}
                      type="date"
                      className="text-xs text-text-tertiary shrink-0 w-[5.5rem]"
                    />

                    {/* Category */}
                    <select
                      value={t.category}
                      onChange={(e) => updateField(i, 'category', e.target.value)}
                      className="text-xs rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-text-primary shrink-0 max-w-[7.5rem]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id} className="bg-bg-primary">
                          {c.icon} {c.label}
                        </option>
                      ))}
                    </select>

                    {/* Amount — editable */}
                    <div className="shrink-0 text-right">
                      <EditableCell
                        value={String(t.amount)}
                        onChange={(v) => {
                          const parsed = parseFloat(v.replace(/[^0-9.]/g, ''));
                          if (!isNaN(parsed)) updateField(i, 'amount', parsed);
                        }}
                        type="number"
                        className="text-sm font-medium text-text-primary w-20 text-right"
                      />
                      <span className="text-[9px] text-text-tertiary block">{hostCurrency}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected total */}
            {selected.size > 0 && (() => {
              const total = transactions
                .filter((_, i) => selected.has(i))
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
              return (
                <div className="flex justify-end">
                  <span className="text-xs text-text-tertiary">
                    Total:{' '}
                    <span className="text-text-primary font-semibold">
                      {formatCurrency(total, hostCurrency)}
                    </span>
                  </span>
                </div>
              );
            })()}

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setStep('upload')}
                disabled={importing}
              >
                ← Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleImport}
                loading={importing}
                disabled={selected.size === 0 || importing}
              >
                Import {selected.size} Expense{selected.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </Modal>
  );
}
