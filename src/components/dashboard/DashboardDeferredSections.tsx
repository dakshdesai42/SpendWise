import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { HiPlus, HiShare } from 'react-icons/hi2';
import type { Expense, Goal, MonthlySummary, UpcomingBill, WeeklyReview } from '../../types/models';
import { itemVariants } from '../../utils/animations';
import { formatCurrency } from '../../utils/formatters';
import { CATEGORY_MAP } from '../../utils/constants';
import { parseLocalDate } from '../../utils/date';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';
import ExpenseList from '../expense/ExpenseList';

type DashboardDeferredSectionsProps = {
  hostCurrency: string;
  currentMonth: string;
  summary: MonthlySummary | null;
  upcoming30Total: number;
  upcomingBills: UpcomingBill[];
  upcomingBillsLoading: boolean;
  upcoming7: UpcomingBill[];
  weeklyReview: WeeklyReview | null;
  goals: Goal[];
  topCategoryLabel: string;
  totalSpent: number;
  recentExpenses: Expense[];
  onApplyUnderspend: () => void;
  onAddGoal: () => void;
  onShareMonthlySummary: () => void;
  onDownloadMonthlySummary: () => void;
};

function safeDueDate(bill: UpcomingBill): Date {
  if (bill.dueDate instanceof Date && !isNaN(bill.dueDate.getTime())) return bill.dueDate;
  const parsed = new Date(bill.dueDate);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default function DashboardDeferredSections({
  hostCurrency,
  currentMonth,
  summary,
  upcoming30Total,
  upcomingBills,
  upcomingBillsLoading,
  upcoming7,
  weeklyReview,
  goals,
  topCategoryLabel,
  totalSpent,
  recentExpenses,
  onApplyUnderspend,
  onAddGoal,
  onShareMonthlySummary,
  onDownloadMonthlySummary,
}: DashboardDeferredSectionsProps) {
  return (
    <>
      {/* Upcoming Bills */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-7 md:p-9">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-text-primary">Upcoming Bills</h3>
            {!upcomingBillsLoading && (
              <span className="text-xs text-text-tertiary">
                Next 30 days: {formatCurrency(upcoming30Total, hostCurrency)}
              </span>
            )}
          </div>
          {upcomingBillsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : upcomingBills.length === 0 ? (
            <p className="text-sm text-text-tertiary">No upcoming recurring bills.</p>
          ) : (
            <div className="space-y-3">
              {upcomingBills.slice(0, 6).map((bill, idx) => {
                const cat = CATEGORY_MAP[bill.category as keyof typeof CATEGORY_MAP] || CATEGORY_MAP.other;
                const dueDate = safeDueDate(bill);
                return (
                  <div key={`${bill.recurringId || 'bill'}-${idx}`} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary truncate">{bill.note || cat.label}</p>
                      <p className="text-xs text-text-tertiary">
                        {format(dueDate, 'EEE, MMM d')} &middot; {bill.frequency}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-text-primary shrink-0 ml-3">
                      {formatCurrency(bill.amount, hostCurrency)}
                    </span>
                  </div>
                );
              })}
              {upcoming7.length > 0 && (
                <p className="text-xs text-warning">
                  {upcoming7.length} bill{upcoming7.length > 1 ? 's' : ''} due in the next 7 days.
                </p>
              )}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Weekly Review */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-7 md:p-8">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Weekly Review</h3>
          {weeklyReview ? (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary">
                {weeklyReview.count} expense{weeklyReview.count !== 1 ? 's' : ''} this week totaling {formatCurrency(weeklyReview.total, hostCurrency)}.
              </p>
              <p className="text-xs text-text-tertiary">
                Top category: {weeklyReview.topCategory?.label || 'Other'}
                {weeklyReview.biggest ? ` • Biggest: ${weeklyReview.biggest.note || 'Expense'} (${formatCurrency(weeklyReview.biggest.amount, hostCurrency)})` : ''}
              </p>
              <p className="text-xs text-accent-secondary">{weeklyReview.action}</p>
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">Not enough data for weekly review yet.</p>
          )}
        </GlassCard>
      </motion.div>

      {/* Goals */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-7 md:p-9">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-text-primary">Savings Goals</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={onApplyUnderspend}>Apply Underspend</Button>
              <Button size="sm" onClick={onAddGoal} icon={<HiPlus className="w-4 h-4" />}>Add Goal</Button>
            </div>
          </div>
          {goals.length === 0 ? (
            <p className="text-sm text-text-tertiary">No goals yet. Create your first goal.</p>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const currentSaved = goal.currentSaved || 0;
                const targetAmount = goal.targetAmount || 0;
                const progress = targetAmount > 0 ? Math.min((currentSaved / targetAmount) * 100, 100) : 0;

                return (
                  <div key={goal.id || goal.title} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-text-primary">{goal.title}</p>
                        <p className="text-xs text-text-tertiary">
                          {formatCurrency(currentSaved, hostCurrency)} / {formatCurrency(targetAmount, hostCurrency)}
                          {goal.targetDate ? ` • target ${format(parseLocalDate(goal.targetDate), 'MMM d, yyyy')}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-text-secondary">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full rounded-full bg-accent-primary" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Monthly Share Card */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-7 md:p-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Monthly Summary</h3>
            <span className="text-xs text-text-tertiary">{currentMonth}</span>
          </div>
          <p className="text-sm text-text-secondary mb-4">
            You spent {formatCurrency(totalSpent, hostCurrency)} across {summary?.transactionCount || 0} transactions.
            Top category was {topCategoryLabel}.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={onShareMonthlySummary} icon={<HiShare className="w-4 h-4" />}>Share</Button>
            <Button size="sm" variant="secondary" onClick={onDownloadMonthlySummary}>Download</Button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Recent Expenses */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-7 md:p-9">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-text-primary">Recent Expenses</h3>
          </div>
          <ExpenseList expenses={recentExpenses} emptyMessage="No expenses yet - add your first one." />
        </GlassCard>
      </motion.div>
    </>
  );
}
