import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Moon, RefreshCw, Sun, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader, Pill, SectionTitle } from '@/components/common/Page';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { ApiError } from '@/services/api-client';
import { getModelInfo } from '@/services/dashboard';
import { getSystemStatus, rescoreAllStudents } from '@/services/system';

function Health({ label, ok, detail }: { label: string; ok: boolean | undefined; detail?: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
      </div>
      {ok === undefined ? <Pill tone="slate">Checking…</Pill> : ok ? <Pill tone="green"><CheckCircle2 size={13} className="mr-1" />Online</Pill> : <Pill tone="red"><XCircle size={13} className="mr-1" />Offline</Pill>}
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [confirmRescore, setConfirmRescore] = useState(false);

  const statusQuery = useQuery({ queryKey: ['system-status'], queryFn: getSystemStatus, refetchInterval: 60_000 });
  const modelQuery = useQuery({ queryKey: ['model-info'], queryFn: getModelInfo });
  const rescoreMutation = useMutation({
    mutationFn: rescoreAllStudents,
    onSuccess: () => {
      setConfirmRescore(false);
      for (const key of ['latest-predictions', 'analytics-summary', 'analytics-overview', 'student-predictions', 'notifications']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  const status = statusQuery.data;
  const model = modelQuery.data;
  const thresholds = model?.riskTierThresholds;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Workspace administration"
        title="Settings"
        description="Live system health, the model configuration in use, and administrative operations."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-6">
          <SectionTitle title="System status" description={status ? `Checked ${new Date(status.checkedAt).toLocaleTimeString()} · refreshes every minute` : 'Checking each service…'} />
          <div className="mt-5 space-y-3">
            <Health label="Backend API" ok={statusQuery.isError ? false : status?.api} detail="Express REST API" />
            <Health label="Database" ok={statusQuery.isError ? false : status?.database} detail="PostgreSQL" />
            <Health label="ML service" ok={statusQuery.isError ? false : status?.mlService} detail={status?.modelVersion ? `Serving ${status.modelVersion}` : 'Flask prediction service'} />
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle title="Model configuration" description="Read from the trained model's metadata — change it by retraining (ml-service/notebooks)" />
          {model ? (
            <dl className="mt-5 grid gap-3 text-sm">
              {[
                ['Model version', model.modelVersion],
                ['At-risk label', model.labelDefinition ?? 'not recorded'],
                ['Risk tiers', thresholds ? `HIGH ≥ ${thresholds.HIGH}% · MEDIUM ≥ ${thresholds.MEDIUM}% · LOW below ${thresholds.MEDIUM}%` : 'not recorded'],
                ['Test accuracy / F1', `${Math.round(model.metrics.accuracy * 1000) / 10}% / ${Math.round(model.metrics.f1 * 1000) / 10}%`],
                ['Evaluation', model.evaluation ?? 'not recorded'],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900 sm:grid-cols-[160px_1fr]">
                  <dt className="font-semibold text-slate-500">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-5 text-sm text-slate-500">{modelQuery.isError ? 'Model information is unavailable — is the ML service running?' : 'Loading…'}</p>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-6">
          <SectionTitle title="Appearance" description="Stored on this device" />
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-semibold">Theme: {theme === 'dark' ? 'Dark' : 'Light'}</span>
            <Button variant="secondary" icon={theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} onClick={toggleTheme}>
              Switch to {theme === 'dark' ? 'light' : 'dark'}
            </Button>
          </div>
        </Card>

        {user?.role === 'admin' && (
          <Card className="p-6">
            <SectionTitle title="Re-score all students" description="Runs every student through the current model — use after retraining. Takes about a minute." />
            <div className="mt-5">
              {!confirmRescore ? (
                <Button icon={<RefreshCw size={16} />} onClick={() => setConfirmRescore(true)} disabled={rescoreMutation.isPending}>Re-score all students</Button>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <p>This adds a new prediction for every student. Earlier predictions stay in each student's history.</p>
                  <div className="mt-3 flex gap-2">
                    <Button onClick={() => rescoreMutation.mutate()} disabled={rescoreMutation.isPending}>{rescoreMutation.isPending ? 'Re-scoring…' : 'Confirm re-score'}</Button>
                    <Button variant="secondary" onClick={() => setConfirmRescore(false)} disabled={rescoreMutation.isPending}>Cancel</Button>
                  </div>
                </div>
              )}
              {rescoreMutation.isSuccess && (
                <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">
                  Re-scored {rescoreMutation.data.count} students ({rescoreMutation.data.failedCount} failed); {rescoreMutation.data.highRisk} are now HIGH risk.
                </p>
              )}
              {rescoreMutation.isError && <p className="mt-4 text-sm text-red-600 dark:text-red-300" role="alert">{(rescoreMutation.error as ApiError).message}</p>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
