import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { HiEnvelope, HiLockClosed } from 'react-icons/hi2';
import { signIn, signInWithGoogle, resetPassword } from '../services/auth';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const startupState = (location.state as { startupState?: string; authError?: string } | null)?.startupState;
  const authError = (location.state as { startupState?: string; authError?: string } | null)?.authError;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const messages: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-email': 'Invalid email address',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/too-many-requests': 'Too many attempts. Try again later',
      };
      toast.error(messages[err.code] || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/google-native-unsupported') {
        toast.error('Google sign-in is not enabled in this iOS beta yet. Use email/password.');
        return;
      }
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error('Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      toast.error('Enter your email first to reset password');
      return;
    }

    setResettingPassword(true);
    try {
      await resetPassword(email.trim());
      toast.success('Password reset email sent. Check your inbox');
    } catch (err: any) {
      const messages: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email',
        'auth/invalid-email': 'Invalid email address',
        'auth/too-many-requests': 'Too many attempts. Try again later',
      };
      toast.error(messages[err.code] || 'Failed to send password reset email');
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-7">
          <h1 className="text-4xl font-bold gradient-text mb-2">SpendWise</h1>
          <p className="text-text-secondary">Track your spending abroad</p>
        </div>

        <GlassCard animate={false} className="p-7 md:p-8 space-y-6">
          {startupState === 'auth_required' && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5">
              <p className="text-xs text-warning">
                {authError || 'Please sign in to continue.'}
              </p>
            </div>
          )}

          <div className="text-center">
            <h2 className="text-xl font-semibold text-text-primary">Welcome back</h2>
            <p className="text-sm text-text-secondary mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
              icon={<HiEnvelope className="w-4 h-4" />}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
              icon={<HiLockClosed className="w-4 h-4" />}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resettingPassword}
                className="text-xs text-accent-primary hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {resettingPassword ? 'Sending reset email...' : 'Forgot password?'}
              </button>
            </div>
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign In
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-bg-secondary px-3 text-text-tertiary">or continue with</span>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            size="lg"
            onClick={handleGoogleSignIn}
            icon={<FcGoogle className="w-5 h-5" />}
          >
            Google
          </Button>

          <p className="text-center text-sm text-text-tertiary">
            Don't have an account?{' '}
            <Link to="/signup" className="text-accent-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
