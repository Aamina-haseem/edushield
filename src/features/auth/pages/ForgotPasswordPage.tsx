import { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { requestPasswordReset } from '@/features/auth/api';
import type { ApiError } from '@/services/api-client';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSending(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthShell>
      <Link className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#003152] dark:hover:text-[#ADDFF1]" to="/login">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>

      {submitted ? (
        <div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Check your inbox</h2>
          <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
            If an account exists for <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>, a password-reset link has been sent. The link works once and expires after 30 minutes.
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Development build: no mail service is configured, so the link is written to the backend server log.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-[#0E7490] dark:text-[#ADDFF1]">Account recovery</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Reset your password</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Enter your university email and we’ll send a secure recovery link.</p>
          <form className="mt-8" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="recovery-email">University email</label>
            <div className="relative mt-2">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="recovery-email"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none focus:border-[#003152] focus:ring-4 focus:ring-[#ADDFF1]/35 dark:border-white/10 dark:bg-white/5 dark:text-white"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200" role="alert">{error}</p>}
            <button className="mt-5 h-12 w-full es-btn-primary rounded-full text-sm font-semibold disabled:opacity-60" type="submit" disabled={sending}>
              {sending ? 'Sending…' : 'Send recovery link'}
            </button>
          </form>
        </div>
      )}
    </AuthShell>
  );
}
