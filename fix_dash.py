import re

def update_usedashboard():
    use_dash_file = "src/hooks/useDashboardData.ts"
    with open(use_dash_file, "r") as f:
        text = f.read()
    import_stmt = "import { DEMO_EXPENSES, DEMO_SUMMARY, DEMO_BUDGET, DEMO_TREND, DEMO_RECURRING, DEMO_GOALS } from '../utils/demoData';\n"
    if "DEMO_EXPENSES" not in text[:500]:
        text = text.replace("import { CATEGORY_MAP } from '../utils/constants';\n", "import { CATEGORY_MAP } from '../utils/constants';\n" + import_stmt)
        with open(use_dash_file, "w") as f:
            f.write(text)

def update_dashboard():
    dash_file = "src/pages/DashboardPage.tsx"
    with open(dash_file, "r") as f:
        dash_text = f.read()

    # 1. Update State & Hooks
    old_state_pattern = r"const \[loading, setLoading\].*?const currentMonth = getCurrentMonth\(\);"
    new_state = """const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [activeInsight, setActiveInsight] = useState('trend');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const currentMonth = getCurrentMonth();

  const {
    recentExpenses, summary, budget, goals, upcomingBills,
    weeklyReview, trendData, isLoading: loading
  } = useDashboardData(user?.uid, currentMonth, demoMode);

  const { mutateAsync: addExpenseMutate } = useAddExpense();
  const { mutateAsync: addGoalMutate } = useAddGoal();
  const { mutateAsync: applyUnderspendMutate } = useApplyUnderspendToGoals();
  const { mutateAsync: autoPostRecurring } = useAutoPostRecurringForMonth();

  useEffect(() => {
    if (user?.uid && !demoMode) {
      autoPostRecurring({ userId: user.uid, month: currentMonth });
    }
  }, [user?.uid, currentMonth, demoMode, autoPostRecurring]);"""
    dash_text = re.sub(old_state_pattern, new_state, dash_text, flags=re.DOTALL)

    # 2. Remove old load data functions
    start_str = "useEffect(() => {\n    if (!user) return;"
    end_str = "};\n  }"
    
    # We will just substring replace from start_str to the end of buildWeeklyReviewFromExpenses
    start_idx = dash_text.find(start_str)
    if start_idx != -1:
        tmp = dash_text[start_idx:]
        end_idx = tmp.find("action: change > 10 ?")
        if end_idx != -1:
            end_match = tmp.find("};\n  }", end_idx) + 5
            dash_text = dash_text[:start_idx] + dash_text[start_idx + end_match:]

    # 3. Update mutations (remove setGoals reference and change to mutateAsync)
    dash_text = re.sub(
        r"async function handleAddExpense.*?\}\n  \}",
        """async function handleAddExpense(data: any) {
    if (demoMode) {
      toast.success('Expense added! (Demo mode)');
      return;
    }
    try {
      await addExpenseMutate({ userId: user!.uid, data });
      toast.success('Expense added!');
    } catch (err) {
      toast.error('Failed to add expense');
    }
  }""",
        dash_text, flags=re.DOTALL
    )

    # 4. Update createGoal
    dash_text = re.sub(
        r"async function handleCreateGoal.*?\}\n  \}",
        """async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalTitle.trim() || !goalAmount || parseFloat(goalAmount) <= 0) return;

    if (demoMode) {
      toast.success('Goal created! (Demo mode)');
      setGoalTitle('');
      setGoalAmount('');
      setGoalDate('');
      setShowGoalModal(false);
      return;
    }

    setSavingGoal(true);
    try {
      await addGoalMutate({ 
        userId: user!.uid, 
        goalData: {
          title: goalTitle.trim(),
          targetAmount: parseFloat(goalAmount),
          targetDate: goalDate || null,
        }
      });
      toast.success('Goal created');
      setGoalTitle('');
      setGoalAmount('');
      setGoalDate('');
      setShowGoalModal(false);
    } catch (err) {
      toast.error('Failed to create goal');
    } finally {
      setSavingGoal(false);
    }
  }""",
        dash_text, flags=re.DOTALL
    )

    # 5. Update applyUnderspend
    dash_text = re.sub(
        r"async function handleApplyUnderspend.*?\}\n  \}",
        """async function handleApplyUnderspend() {
    const available = Math.max(budgetRemaining || 0, 0);
    if (available <= 0) {
      toast.error('No underspend available to allocate');
      return;
    }

    if (demoMode) {
      toast.success('Applied this month underspend to goals (Demo mode)');
      return;
    }

    try {
      await applyUnderspendMutate({ userId: user!.uid, amount: available });
      toast.success('Applied underspend to your active goals');
    } catch (err) {
      toast.error('Failed to apply underspend');
    }
  }""",
        dash_text, count=1, flags=re.DOTALL
    )

    with open(dash_file, "w") as f:
        f.write(dash_text)

update_usedashboard()
update_dashboard()
print("Done!")
