import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, GraduationCap, LockKeyhole, Mail } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { useAuth } from '@/features/auth/context/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login({ email, password, rememberMe });
      const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(destination, { replace: true });
    } catch (loginError) {
      const message = (loginError as { message?: string } | undefined)?.message;
      setError(message ?? 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <div className="mb-8 lg:hidden">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#003152] text-[#ADDFF1]">
            <GraduationCap className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-[#003152] dark:text-[#ADDFF1]">EduShield AI</p>
        </div>

        <p className="text-sm font-semibold text-[#0E7490] dark:text-[#ADDFF1]">Secure university access</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Welcome back</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Sign in to continue to your student success workspace.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email address</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#003152] focus:ring-4 focus:ring-[#ADDFF1]/35 dark:border-white/10 dark:bg-white/5 dark:text-white"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Password</span>
              <Link className="text-xs font-semibold text-[#0E7490] hover:underline dark:text-[#ADDFF1]" to="/forgot-password">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-900 outline-none transition focus:border-[#003152] focus:ring-4 focus:ring-[#ADDFF1]/35 dark:border-white/10 dark:bg-white/5 dark:text-white"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <input
              className="h-4 w-4 rounded border-slate-300 accent-[#003152]"
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            Keep me signed in on this device
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" role="alert">
              {error}
            </div>
          ) : null}

          <button
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#003152] text-sm font-semibold text-white shadow-lg shadow-[#003152]/20 transition hover:-translate-y-0.5 hover:bg-[#06456f] disabled:cursor-not-allowed disabled:opacity-65"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in securely'}
          </button>
        </form>
      </motion.div>
    </AuthShell>
  );
}
