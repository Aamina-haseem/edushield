import { useState, type FormEvent } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader, Pill, SectionTitle } from '@/components/common/Page';
import { changePassword, passwordProblem } from '@/features/auth/api';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { ApiError } from '@/services/api-client';

const ROLE_LABELS = { admin: 'Administrator', advisor: 'Academic advisor', student: 'Student' } as const;
const inputClass = 'mt-2 w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 text-sm font-normal outline-none focus:border-sky-500 dark:border-slate-700';

export function ProfilePage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const problem = passwordProblem(next);
    if (problem) return setError(problem);
    if (next !== confirmation) return setError('The new passwords do not match.');
    setError('');
    setSaving(true);
    try {
      await changePassword(current, next);
      setSaved(true);
      setCurrent('');
      setNext('');
      setConfirmation('');
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Account" title="My Profile" description="Your account details and sign-in security." />
      <div className="grid gap-5 xl:grid-cols-[330px_1fr]">
        <Card className="h-fit p-6 text-center">
          <span className="mx-auto grid size-28 place-items-center rounded-[2rem] bg-[#003152] text-3xl font-black text-white">{user.avatarInitials}</span>
          <h2 className="mt-5 text-xl font-bold">{user.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          <div className="mt-3"><Pill tone="blue">{ROLE_LABELS[user.role]}</Pill></div>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            Name, email and role are managed by an administrator. Contact them if any of these details are wrong.
          </p>
        </Card>

        <Card className="p-6">
          <SectionTitle title="Change password" description="At least 8 characters, with at least one letter and one number" />
          <form className="mt-6 grid max-w-xl gap-4" onSubmit={handleSubmit}>
            <label className="text-sm font-semibold">Current password
              <input className={inputClass} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </label>
            <label className="text-sm font-semibold">New password
              <input className={inputClass} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
            </label>
            <label className="text-sm font-semibold">Confirm new password
              <input className={inputClass} type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
            </label>
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200" role="alert">{error}</p>}
            {saved && <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"><CheckCircle2 size={16} />Password changed.</p>}
            <div><Button type="submit" icon={<KeyRound size={16} />} disabled={saving}>{saving ? 'Saving…' : 'Change password'}</Button></div>
          </form>
        </Card>
      </div>
    </div>
  );
}
