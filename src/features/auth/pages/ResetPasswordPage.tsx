import { useState, type FormEvent } from 'react';
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { passwordProblem, resetPassword } from '@/features/auth/api';
import type { ApiError } from '@/services/api-client';

const inputClass = 'h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-sm outline-none focus:border-[#003152] focus:ring-4 focus:ring-[#ADDFF1]/35 dark:border-white/10 dark:bg-white/5 dark:text-white';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirmation) return setError('Passwords do not match.');
    setError('');
    setSaving(true);
    try {
      await resetPassword(token!, password);
      setComplete(true);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  const passwordField = (label: string, value: string, onChange: (next: string) => void, id: string) => (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <div className="relative">
        <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input id={id} className={inputClass} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} required />
        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" type="button" onClick={() => setShowPassword((current) => !current)} aria-label="Toggle password visibility">
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </label>
  );

  return (
    <AuthShell>
      {!token ? (
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Reset link missing</h2>
          <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">Open the link from your password-reset email, or request a new one.</p>
          <Link className="mt-8 inline-flex h-12 w-full items-center justify-center es-btn-primary rounded-full text-sm font-semibold" to="/forgot-password">Request a new link</Link>
        </div>
      ) : complete ? (
        <div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Password updated</h2>
          <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">Your password has been changed. Sign in with your new password.</p>
          <Link className="mt-8 inline-flex h-12 w-full items-center justify-center es-btn-primary rounded-full text-sm font-semibold" to="/login">Return to sign in</Link>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-[#0E7490] dark:text-[#ADDFF1]">Secure password update</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Create a new password</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">At least eight characters, with at least one letter and one number.</p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {passwordField('New password', password, setPassword, 'new-password')}
            {passwordField('Confirm password', confirmation, setConfirmation, 'confirm-password')}
            {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200" role="alert">{error}</div> : null}
            <button className="h-12 w-full es-btn-primary rounded-full text-sm font-semibold disabled:opacity-60" type="submit" disabled={saving}>
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      )}
    </AuthShell>
  );
}
