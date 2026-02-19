import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { HiEnvelope, HiLockClosed, HiUser } from 'react-icons/hi2';
import { signUp, signInWithGoogle } from '../services/auth';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { POPULAR_CURRENCIES } from '../utils/constants';
import toast from 'react-hot-toast';

const currencyOptions = POPULAR_CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.symbol} ${c.code} — ${c.name}`,
}));

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    homeCurrency: '',
    hostCurrency: '',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.homeCurrency || !form.hostCurrency) {
      toast.error('Please select both currencies');
      return;
    }

    setLoading(true);
    try {
      await signUp(form.email, form.password, form.name, form.homeCurrency, form.hostCurrency);
      toast.success('Welcome to SpendWise!');
      navigate('/dashboard');
    } catch (err: any) {
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'An account with this email already exists',
        'auth/invalid-email': 'Invalid email address',
        'auth/weak-password': 'Password is too weak',
      };
      toast.error(messages[err.code] || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (!form.homeCurrency || !form.hostCurrency) {
      toast.error('Please select your currencies first');
      return;
    }

    setLoading(true);
    try {
      await signInWithGoogle(form.homeCurrency, form.hostCurrency);
      toast.success('Welcome to SpendWise!');
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error('Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-accent-tertiary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-7">
          <h1 className="text-4xl font-bold gradient-text mb-2">SpendWise</h1>
          <p className="text-text-secondary">Start tracking your spending abroad</p>
        </div>

        <GlassCard animate={false} className="p-7 md:p-8 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-3">
            <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-accent-primary' : 'bg-white/10'}`} />
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-accent-primary' : 'bg-white/10'}`} />
          </div>

          {step === 1 ? (
            <>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-text-primary">Create account</h2>
                <p className="text-sm text-text-secondary mt-1">Step 1 of 2 - Your details</p>
              </div>

              <form onSubmit={handleNext} className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="What should we call you?"
                  value={form.name}
                  onChange={(e: any) => update('name', e.target.value)}
                  icon={<HiUser className="w-4 h-4" />}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@university.edu"
                  value={form.email}
                  onChange={(e: any) => update('email', e.target.value)}
                  icon={<HiEnvelope className="w-4 h-4" />}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e: any) => update('password', e.target.value)}
                  icon={<HiLockClosed className="w-4 h-4" />}
                />
                <Button type="submit" className="w-full" size="lg">
                  Continue
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-text-primary">Your currencies</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Step 2 of 2 - We'll show every expense in both
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  label="Home Currency (where you're from)"
                  placeholder="Select your home currency"
                  value={form.homeCurrency}
                  onChange={(e: any) => update('homeCurrency', e.target.value)}
                  options={currencyOptions}
                />
                <Select
                  label="Host Currency (where you study)"
                  placeholder="Select your host currency"
                  value={form.hostCurrency}
                  onChange={(e: any) => update('hostCurrency', e.target.value)}
                  options={currencyOptions}
                />

                {form.homeCurrency && form.hostCurrency && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-xl bg-accent-primary/10 border border-accent-primary/20 p-4 text-center"
                  >
                    <p className="text-sm text-text-secondary">
                      Every expense will show amounts in both{' '}
                      <span className="text-accent-primary font-medium">{form.hostCurrency}</span>
                      {' '}and{' '}
                      <span className="text-accent-primary font-medium">{form.homeCurrency}</span>
                    </p>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    size="lg"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button type="submit" loading={loading} className="flex-1" size="lg">
                    Create Account
                  </Button>
                </div>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.08]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-bg-secondary px-3 text-text-tertiary">or</span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                size="lg"
                onClick={handleGoogleSignIn}
                icon={<FcGoogle className="w-5 h-5" />}
              >
                Sign up with Google
              </Button>
            </>
          )}

          <p className="text-center text-sm text-text-tertiary">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
