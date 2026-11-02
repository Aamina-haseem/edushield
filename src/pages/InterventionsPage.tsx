import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Clock3, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader, Pill, SectionTitle, Stat } from '@/components/common/Page';
import type { ApiError } from '@/services/api-client';
import { listStudents } from '@/services/students';
import { listInterventions, updateIntervention } from '@/services/interventions';
import type { Intervention, RiskTier } from '@/types/contract';

type InterventionPatch = Partial<Pick<Intervention, 'status' | 'notes' | 'nextMeetingAt'>>;

/** ISO timestamp -> the local "YYYY-MM-DDTHH:mm" format a datetime-local input expects. */
function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

const riskTone: Record<RiskTier, 'red' | 'amber' | 'green'> = { HIGH: 'red', MEDIUM: 'amber', LOW: 'green' };
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function InterventionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const interventionsQuery = useQuery({ queryKey: ['interventions'], queryFn: () => listInterventions() });
  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: () => listStudents() });

  const studentById = useMemo(() => {
    const map = new Map<string, { name: string; studentNumber: string }>();
    for (const student of studentsQuery.data ?? []) map.set(student.id, student);
    return map;
  }, [studentsQuery.data]);

  // Per-card meeting drafts, keyed by intervention id.
  const [meetingDrafts, setMeetingDrafts] = useState<Record<string, string>>({});

  const updateMutation = useMutation({
    mutationFn: ({ intervention, patch }: { intervention: Intervention; patch: InterventionPatch }) => updateIntervention(intervention.id, patch),
    onSuccess: (_data, { intervention }) => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['student-interventions', intervention.studentId] });
      setMeetingDrafts(({ [intervention.id]: _saved, ...rest }) => rest);
    },
  });

  const interventions = interventionsQuery.data ?? [];
  const active = interventions.filter((i) => i.status !== 'completed');
  const completed = interventions.filter((i) => i.status === 'completed');
  const meetingsThisWeek = interventions.filter(
    (i) => i.nextMeetingAt && new Date(i.nextMeetingAt).getTime() - Date.now() < WEEK_MS && new Date(i.nextMeetingAt).getTime() > Date.now(),
  );
  const completionRate = interventions.length ? Math.round((completed.length / interventions.length) * 100) : 0;

  const tierCounts = interventions.reduce(
    (acc, i) => ({ ...acc, [i.tier]: (acc[i.tier] ?? 0) + 1 }),
    {} as Record<RiskTier, number>,
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Student support"
        title="Intervention Management"
        description="Coordinate targeted support plans, advisor ownership, meeting schedules and measurable student outcomes."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active interventions" value={String(active.length)} note={`${interventions.length} total on record`} />
        <Stat label="Completed" value={String(completed.length)} note={`${completionRate}% of all cases`} />
        <Stat label="Meetings this week" value={String(meetingsThisWeek.length)} note="Scheduled follow-ups" />
        <Stat label="Completion rate" value={`${completionRate}%`} note="Cases marked completed (not an outcome measure)" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="p-6">
          <SectionTitle title="Active support plans" description="Live intervention cases requiring advisor action" />
          <div className="mt-5 space-y-4">
            {interventionsQuery.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading interventions…</p>}
            {active.map((intervention) => {
              const student = studentById.get(intervention.studentId);
              const isUpdating = updateMutation.isPending && updateMutation.variables?.intervention.id === intervention.id;
              const updateError =
                updateMutation.isError && updateMutation.variables?.intervention.id === intervention.id ? (updateMutation.error as ApiError).message : null;
              const meetingDraft = meetingDrafts[intervention.id] ?? (intervention.nextMeetingAt ? toLocalInputValue(intervention.nextMeetingAt) : '');
              return (
                <article key={intervention.id} className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{student?.name ?? 'Unknown student'}</h3>
                        <Pill tone={riskTone[intervention.tier]}>{intervention.tier}</Pill>
                        <Pill tone={intervention.status === 'in_progress' ? 'blue' : 'amber'}>{intervention.status.replace('_', ' ')}</Pill>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{intervention.recommendedActions[0] ?? 'Support plan'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => navigate(`/students/${intervention.studentId}`)}>Open case</Button>
                      {intervention.status === 'pending' && (
                        <Button variant="secondary" onClick={() => updateMutation.mutate({ intervention, patch: { status: 'in_progress' } })} disabled={isUpdating}>
                          <PlayCircle size={16} />Start
                        </Button>
                      )}
                      <Button onClick={() => updateMutation.mutate({ intervention, patch: { status: 'completed' } })} disabled={isUpdating}>
                        <CheckCircle2 size={16} />Complete
                      </Button>
                    </div>
                  </div>
                  <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {intervention.recommendedActions.map((action) => <li key={action}>{action}</li>)}
                  </ul>
                  {intervention.nextMeetingAt && (
                    <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 size={14} />Next meeting: {new Date(intervention.nextMeetingAt).toLocaleString()}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <CalendarClock size={14} />Schedule meeting
                      <input
                        type="datetime-local"
                        value={meetingDraft}
                        onChange={(event) => setMeetingDrafts((drafts) => ({ ...drafts, [intervention.id]: event.target.value }))}
                        className="rounded-xl border border-slate-200 bg-transparent px-3 py-1.5 text-sm font-normal text-slate-700 outline-none focus:border-[#003152] dark:border-slate-700 dark:text-slate-200"
                      />
                    </label>
                    <Button
                      variant="secondary"
                      onClick={() => updateMutation.mutate({ intervention, patch: { nextMeetingAt: new Date(meetingDraft).toISOString() } })}
                      disabled={isUpdating || !meetingDraft || meetingDrafts[intervention.id] === undefined}
                    >
                      Save meeting
                    </Button>
                  </div>
                  {updateError ? <p className="mt-3 text-sm text-red-600 dark:text-red-300" role="alert">Update failed: {updateError}</p> : null}
                </article>
              );
            })}
            {!interventionsQuery.isLoading && active.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No active interventions right now.</p>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <SectionTitle title="Support mix" description="Interventions by risk tier" />
            <div className="mt-4 space-y-3">
              {(['HIGH', 'MEDIUM', 'LOW'] as RiskTier[]).map((tier) => (
                <div key={tier} className="flex items-center justify-between">
                  <Pill tone={riskTone[tier]}>{tier}</Pill>
                  <span className="text-sm font-bold">{tierCounts[tier] ?? 0}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <SectionTitle title="Recently completed" />
            <div className="mt-4 space-y-2">
              {completed.slice(0, 5).map((intervention) => (
                <div key={intervention.id} className="rounded-2xl border border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
                  {studentById.get(intervention.studentId)?.name ?? 'Unknown student'}
                </div>
              ))}
              {completed.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Nothing completed yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
