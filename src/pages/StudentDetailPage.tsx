import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CalendarPlus, Pencil, Play } from 'lucide-react';
import { PageHeader, Pill, SectionTitle, Stat } from '@/components/common/Page';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ApiError } from '@/services/api-client';
import { getStudent, getStudentInterventions, getStudentPredictions } from '@/services/students';
import { runPrediction } from '@/services/predictions';
import { createIntervention } from '@/services/interventions';
import type { RiskTier } from '@/types/contract';

const riskTone: Record<RiskTier, 'red' | 'amber' | 'green'> = { HIGH: 'red', MEDIUM: 'amber', LOW: 'green' };

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [isCreatingIntervention, setIsCreatingIntervention] = useState(false);
  const [actionError, setActionError] = useState('');

  const studentQuery = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: Boolean(id),
  });
  const predictionsQuery = useQuery({
    queryKey: ['student-predictions', id],
    queryFn: () => getStudentPredictions(id!),
    enabled: Boolean(id),
  });
  const interventionsQuery = useQuery({
    queryKey: ['student-interventions', id],
    queryFn: () => getStudentInterventions(id!),
    enabled: Boolean(id),
  });

  if (studentQuery.isLoading) {
    return <div className="grid min-h-[50vh] place-items-center text-slate-500 dark:text-slate-400">Loading student…</div>;
  }
  if (studentQuery.isError || !studentQuery.data) {
    return <div className="grid min-h-[50vh] place-items-center text-slate-500 dark:text-slate-400">Student not found.</div>;
  }

  const student = studentQuery.data;
  const predictions = predictionsQuery.data ?? [];
  const latest = predictions[0];
  const interventions = interventionsQuery.data ?? [];
  const openIntervention = interventions.find((i) => i.status !== 'completed');

  async function handleRunPrediction() {
    if (!id) return;
    setActionError('');
    setIsRunning(true);
    try {
      await runPrediction(id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['student-predictions', id] }),
        queryClient.invalidateQueries({ queryKey: ['latest-predictions'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics-summary'] }),
      ]);
    } catch (error) {
      setActionError(`Prediction failed: ${(error as ApiError).message}`);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleCreateIntervention() {
    if (!id || !latest) return;
    setActionError('');
    setIsCreatingIntervention(true);
    try {
      await createIntervention(id, latest.id);
    } catch (error) {
      // 409 = a plan for this prediction already exists; the refetch below simply shows it.
      if ((error as ApiError).status !== 409) setActionError(`Could not create intervention: ${(error as ApiError).message}`);
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['interventions'] }),
        queryClient.invalidateQueries({ queryKey: ['student-interventions', id] }),
      ]);
      setIsCreatingIntervention(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Student record"
        title={student.name}
        description={`${student.studentNumber} · ${student.programme} · Year ${student.yearOfStudy}`}
        actions={
          <>
            <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate('/students')}>Back to directory</Button>
            <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => navigate(`/students/${student.id}/edit`)}>Edit details</Button>
            <Button variant="secondary" icon={<Play size={16} />} onClick={handleRunPrediction} disabled={isRunning}>
              {isRunning ? 'Running…' : 'Run new prediction'}
            </Button>
            <Button
              icon={<CalendarPlus size={16} />}
              onClick={handleCreateIntervention}
              disabled={!latest || isCreatingIntervention || interventionsQuery.isLoading || Boolean(openIntervention)}
            >
              {isCreatingIntervention ? 'Creating…' : openIntervention ? 'Intervention active' : 'Start intervention'}
            </Button>
          </>
        }
      />

      {actionError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" role="alert">
          {actionError}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Absences" value={String(student.features.absences)} note="Recorded absences" />
        <Stat label="Final grade (G3)" value={student.features.g3 === null ? 'Not yet known' : `${student.features.g3}/20`} note={`G1 ${student.features.g1} · G2 ${student.features.g2}`} />
        <Stat label="Past failures" value={String(student.features.failures)} note="Previously failed modules" />
        <Stat label="Study time" value={['<2h', '2-5h', '5-10h', '>10h'][student.features.studytime - 1] ?? '—'} note="Weekly self-reported" />
      </section>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionTitle title="Latest prediction" description={latest ? `${latest.modelVersion} · ${new Date(latest.predictedAt).toLocaleString()}` : 'No prediction on record yet'} />
          {latest && <Pill tone={riskTone[latest.riskTier]}>{latest.riskTier} risk · {latest.riskScore}%</Pill>}
        </div>

        {latest ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {latest.shapFactors.slice(0, 6).map((factor) => (
              <div key={factor.rawFeature} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">{factor.feature}</p>
                  <span
                    className={`shrink-0 text-xs font-bold ${factor.direction === 'increases' ? 'text-red-600 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300'}`}
                    title="This factor's share of the explanation, not a change in risk"
                  >
                    {factor.direction === 'increases' ? '↑ Raises' : '↓ Lowers'} · {factor.contributionPct.toFixed(0)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{factor.explanation}</p>
              </div>
            ))}
            <p className="text-xs text-slate-500 sm:col-span-2 dark:text-slate-400">
              Percentages show each factor's share of this explanation, not a change in the risk score. They describe what the model associates with risk, not proven causes.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Run a prediction to see SHAP-explained risk factors here.</p>
        )}
      </Card>

      <Card className="p-6">
        <SectionTitle title="Interventions" description={`${interventions.length} on record`} />
        <div className="mt-4 space-y-3">
          {interventions.map((intervention) => (
            <div key={intervention.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Pill tone={riskTone[intervention.tier]}>{intervention.tier}</Pill>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{intervention.status.replace('_', ' ')}</span>
                </div>
                <span className="text-xs text-slate-500">Opened {new Date(intervention.createdAt).toLocaleString()}</span>
              </div>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {intervention.recommendedActions.map((action) => <li key={action}>{action}</li>)}
              </ul>
              {intervention.notes ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400"><b>Note:</b> {intervention.notes}</p> : null}
              {intervention.nextMeetingAt ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><CalendarClock size={14} />Next meeting: {new Date(intervention.nextMeetingAt).toLocaleString()}</p>
              ) : null}
            </div>
          ))}
          {!interventionsQuery.isLoading && interventions.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No interventions yet.</p>}
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle title="Prediction history" description={`${predictions.length} recorded`} />
        <div className="mt-4 space-y-2">
          {predictions.map((prediction) => (
            <div key={prediction.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">{new Date(prediction.predictedAt).toLocaleString()}</span>
              <Pill tone={riskTone[prediction.riskTier]}>{prediction.riskTier} · {prediction.riskScore}%</Pill>
            </div>
          ))}
          {predictions.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No predictions yet.</p>}
        </div>
      </Card>
    </div>
  );
}
