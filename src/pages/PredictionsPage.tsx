import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Filter,
  Info,
  Mail,
  Search,
  ShieldAlert,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader, Pill, SectionTitle } from '@/components/common/Page';
import type { ApiError } from '@/services/api-client';
import { getStudentInterventions, getStudentPredictions, listStudents } from '@/services/students';
import { listLatestPredictions, runPrediction as runPredictionRequest } from '@/services/predictions';
import { createIntervention as createInterventionRequest, updateIntervention } from '@/services/interventions';
import type { RiskTier } from '@/types/contract';

const EXPLORER_LIMIT = 100;

type FilterValue = 'All' | RiskTier;

function riskTone(tier: RiskTier): 'red' | 'amber' | 'green' {
  if (tier === 'HIGH') return 'red';
  if (tier === 'MEDIUM') return 'amber';
  return 'green';
}

function Metric({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-black ${warning ? 'text-red-600 dark:text-red-300' : 'text-slate-950 dark:text-white'}`}>{value}</p>
    </div>
  );
}

export function PredictionsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('All');
  // Keyed by student so a draft typed for one student never carries over to the next one selected.
  const [noteDraftState, setNoteDraftState] = useState<{ studentId: string | null; text: string }>({ studentId: null, text: '' });

  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: () => listStudents() });
  const latestPredictionsQuery = useQuery({ queryKey: ['latest-predictions'], queryFn: () => listLatestPredictions(2000) });

  const riskByStudentId = useMemo(() => {
    const map = new Map<string, { riskTier: RiskTier; riskScore: number }>();
    for (const prediction of latestPredictionsQuery.data ?? []) {
      map.set(prediction.studentId, { riskTier: prediction.riskTier, riskScore: prediction.riskScore });
    }
    return map;
  }, [latestPredictionsQuery.data]);

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !normalized ||
        student.name.toLowerCase().includes(normalized) ||
        student.studentNumber.toLowerCase().includes(normalized) ||
        student.programme.toLowerCase().includes(normalized);
      const risk = riskByStudentId.get(student.id);
      const matchesFilter = filter === 'All' || risk?.riskTier === filter;
      return matchesSearch && matchesFilter;
    });
  }, [students, riskByStudentId, filter, query]);

  const activeId = selectedId ?? filteredStudents[0]?.id ?? null;
  const selectedStudent = students.find((s) => s.id === activeId) ?? null;

  const predictionQuery = useQuery({
    queryKey: ['student-predictions', activeId],
    queryFn: () => getStudentPredictions(activeId!),
    enabled: Boolean(activeId),
  });
  const latestPrediction = predictionQuery.data?.[0] ?? null;

  const studentInterventionsQuery = useQuery({
    queryKey: ['student-interventions', activeId],
    queryFn: () => getStudentInterventions(activeId!),
    enabled: Boolean(activeId),
  });

  const noteDraft = noteDraftState.studentId === activeId ? noteDraftState.text : '';
  const setNoteDraft = (text: string) => setNoteDraftState({ studentId: activeId, text });

  // Mutations take the student id as a variable so their pending/error/result state can be
  // matched against the currently selected student — switching students must never show (or
  // write to) another student's prediction run or intervention.
  const runMutation = useMutation({
    mutationFn: (studentId: string) => runPredictionRequest(studentId),
    onSuccess: (_prediction, studentId) => {
      queryClient.invalidateQueries({ queryKey: ['student-predictions', studentId] });
      queryClient.invalidateQueries({ queryKey: ['latest-predictions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
  });
  const isRunningForActive = runMutation.isPending && runMutation.variables === activeId;
  const runErrorForActive = runMutation.isError && runMutation.variables === activeId ? (runMutation.error as ApiError).message : null;

  const interventionMutation = useMutation({
    mutationFn: ({ studentId, predictionId }: { studentId: string; predictionId: string }) => createInterventionRequest(studentId, predictionId),
    // A 409 means the plan already exists — refetching shows it instead of an error.
    onSettled: (_data, _error, { studentId }) => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['student-interventions', studentId] });
    },
  });
  const createdForActive = interventionMutation.data?.studentId === activeId ? interventionMutation.data : null;
  const openIntervention = createdForActive ?? studentInterventionsQuery.data?.find((i) => i.status !== 'completed') ?? null;
  const interventionError =
    interventionMutation.isError && interventionMutation.variables?.studentId === activeId && (interventionMutation.error as ApiError).status !== 409
      ? (interventionMutation.error as ApiError).message
      : null;

  const noteMutation = useMutation({
    mutationFn: ({ interventionId, notes }: { interventionId: string; studentId: string; notes: string }) => updateIntervention(interventionId, { notes }),
    onSuccess: (_data, { studentId }) => queryClient.invalidateQueries({ queryKey: ['student-interventions', studentId] }),
  });
  const noteSavedForActive = noteMutation.isSuccess && noteMutation.variables?.interventionId === openIntervention?.id;
  const noteErrorForActive = noteMutation.isError && noteMutation.variables?.interventionId === openIntervention?.id ? (noteMutation.error as ApiError).message : null;

  const riskTier = latestPrediction?.riskTier;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Advisor workflow"
        title="Student Risk Evaluation"
        description="Select one student, review the evidence used by the model, run the prediction, understand the SHAP explanation, and create the appropriate intervention."
      />

      <Card className="overflow-hidden p-0">
        <div className="grid border-b border-slate-200 bg-slate-50/80 md:grid-cols-5 dark:border-slate-800 dark:bg-slate-900/50">
          {[
            ['1', 'Select student'],
            ['2', 'Review data'],
            ['3', 'Run prediction'],
            ['4', 'Explain result'],
            ['5', 'Assign support'],
          ].map(([number, label], index) => (
            <div key={number} className="flex items-center gap-3 border-slate-200 px-4 py-4 md:border-r dark:border-slate-800">
              <span className={`grid size-8 place-items-center rounded-full text-xs font-black ${index < 4 ? 'bg-[#003152] text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700'}`}>{number}</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-3 bg-sky-50 px-5 py-4 text-sm text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
          <Info className="mt-0.5 size-5 shrink-0" />
          <p><b>How risk is measured:</b> EduShield combines academic, attendance, engagement and behavioural indicators. The trained model produces a dropout probability, while SHAP shows which factors increased or reduced that prediction.</p>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit p-5 xl:sticky xl:top-6">
          <div className="flex items-center justify-between">
            <SectionTitle title="Student Explorer" description="Choose a student to evaluate" />
            <Pill tone="blue">{filteredStudents.length} shown</Pill>
          </div>

          <div className="relative mt-5">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, ID or programme"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#003152] focus:ring-4 focus:ring-[#ADDFF1]/30 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="size-4 shrink-0 text-slate-400" />
            {(['All', 'HIGH', 'MEDIUM', 'LOW'] as FilterValue[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${filter === value ? 'bg-[#003152] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
              >
                {value === 'All' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {filteredStudents.slice(0, EXPLORER_LIMIT).map((student) => {
              const risk = riskByStudentId.get(student.id);
              const active = student.id === activeId;
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedId(student.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-[#003152] bg-[#003152] text-white shadow-lg shadow-[#003152]/15' : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-sky-800'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{student.name}</p>
                      <p className={`mt-1 truncate text-xs ${active ? 'text-white/65' : 'text-slate-500'}`}>{student.studentNumber}</p>
                    </div>
                    {risk ? <Pill tone={riskTone(risk.riskTier)}>{risk.riskTier}</Pill> : <Pill tone="slate">New</Pill>}
                  </div>
                  <p className={`mt-3 truncate text-xs ${active ? 'text-white/75' : 'text-slate-600 dark:text-slate-400'}`}>{student.programme}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-xs ${active ? 'text-white/65' : 'text-slate-500'}`}>Year {student.yearOfStudy}</span>
                    {risk && <span className="text-sm font-black">{risk.riskScore}%</span>}
                  </div>
                </button>
              );
            })}
            {filteredStudents.length > EXPLORER_LIMIT ? (
              <p className="px-1 pt-1 text-xs text-slate-500">Showing the first {EXPLORER_LIMIT} of {filteredStudents.length} students — search or filter to find others.</p>
            ) : null}
            {filteredStudents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No students match the current search and filter.</div>
            ) : null}
          </div>
        </Card>

        <div className="space-y-6">
          {selectedStudent && (
            <Card className="p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sky-100 text-[#003152] dark:bg-sky-950/50 dark:text-sky-200">
                    <UserRound className="size-7" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black text-slate-950 dark:text-white">{selectedStudent.name}</h2>
                      {riskTier && <Pill tone={riskTone(riskTier)}>{riskTier} risk</Pill>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{selectedStudent.studentNumber} · {selectedStudent.programme} · Year {selectedStudent.yearOfStudy}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" />{selectedStudent.email}</span>
                      {latestPrediction && (
                        <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5" />Last evaluated {new Date(latestPrediction.predictedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={() => runMutation.mutate(selectedStudent.id)} disabled={isRunningForActive} className="min-w-44">
                  <BrainCircuit size={17} />{isRunningForActive ? 'Evaluating…' : 'Run AI prediction'}
                </Button>
              </div>

              {runErrorForActive ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" role="alert">
                  Prediction failed: {runErrorForActive}
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Metric label="Absences" value={String(selectedStudent.features.absences)} warning={selectedStudent.features.absences >= 13} />
                <Metric label="Grade (G3)" value={`${selectedStudent.features.g3}/20`} warning={selectedStudent.features.g3 < 10} />
                <Metric label="Failed modules" value={String(selectedStudent.features.failures)} warning={selectedStudent.features.failures > 0} />
                <Metric label="Study time" value={['<2h', '2-5h', '5-10h', '>10h'][selectedStudent.features.studytime - 1] ?? '—'} />
                <Metric label="Health" value={`${selectedStudent.features.health}/5`} warning={selectedStudent.features.health <= 2} />
              </div>
            </Card>
          )}

          {isRunningForActive ? (
            <Card className="p-10 text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }} className="mx-auto grid size-14 place-items-center rounded-2xl bg-sky-100 text-[#003152] dark:bg-sky-950/50 dark:text-sky-200">
                <BrainCircuit className="size-7" />
              </motion.div>
              <h3 className="mt-5 text-xl font-black">Evaluating student risk</h3>
              <p className="mt-2 text-sm text-slate-500">Running the trained model and computing SHAP explanations…</p>
            </Card>
          ) : latestPrediction && riskTier ? (
            <>
              <Card className="overflow-hidden p-0">
                <div className={`grid gap-6 p-6 lg:grid-cols-[260px_1fr] ${riskTier === 'HIGH' ? 'bg-red-50/60 dark:bg-red-950/10' : riskTier === 'MEDIUM' ? 'bg-amber-50/60 dark:bg-amber-950/10' : 'bg-emerald-50/60 dark:bg-emerald-950/10'}`}>
                  <div className="flex flex-col justify-center rounded-3xl bg-white p-6 text-center shadow-sm dark:bg-slate-950/70">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Dropout probability</p>
                    <p className={`mt-3 text-6xl font-black ${riskTier === 'HIGH' ? 'text-red-600 dark:text-red-300' : riskTier === 'MEDIUM' ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{latestPrediction.riskScore}%</p>
                    <div className="mx-auto mt-3"><Pill tone={riskTone(riskTier)}>{riskTier} risk</Pill></div>
                    <p className="mt-4 text-xs text-slate-500">Model confidence: <b>{latestPrediction.confidencePct}%</b></p>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className={`size-7 ${riskTier === 'HIGH' ? 'text-red-600' : riskTier === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'}`} />
                      <h2 className="text-2xl font-black">What this result means</h2>
                    </div>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {riskTier === 'HIGH'
                        ? `${selectedStudent?.name} is currently showing multiple strong indicators associated with dropout. Immediate advisor review and a coordinated intervention are recommended.`
                        : riskTier === 'MEDIUM'
                          ? `${selectedStudent?.name} has several emerging risk indicators. Early academic monitoring and a short advisor check-in are recommended.`
                          : `${selectedStudent?.name} is currently showing stable participation and academic progress. Continue routine monitoring.`}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span className="rounded-full bg-white px-3 py-2 shadow-sm dark:bg-slate-950/60">Model: {latestPrediction.modelVersion}</span>
                      <span className="rounded-full bg-white px-3 py-2 shadow-sm dark:bg-slate-950/60">Explanation: SHAP</span>
                      <span className="rounded-full bg-white px-3 py-2 shadow-sm dark:bg-slate-950/60">Decision support only</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <SectionTitle title="Why did the AI produce this result?" description="Local SHAP explanation for the selected student" />
                  <Pill tone="blue">Explainable AI</Pill>
                </div>
                <div className="mt-6 space-y-4">
                  {latestPrediction.shapFactors.map((factor, index) => (
                    <div key={factor.rawFeature} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`grid size-9 place-items-center rounded-xl text-sm font-black ${factor.direction === 'increases' ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>{index + 1}</span>
                          <div>
                            <p className="font-bold">{factor.feature}</p>
                            <p className="mt-0.5 text-xs text-slate-500">Observed value: {String(factor.observedValue)}</p>
                          </div>
                        </div>
                        <Pill tone={factor.direction === 'increases' ? 'red' : 'green'}>{factor.direction === 'increases' ? 'Increases risk' : 'Reduces risk'}</Pill>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, factor.contributionPct)}%` }} transition={{ duration: 0.55, delay: index * 0.08 }} className={`h-full rounded-full ${factor.direction === 'increases' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{factor.explanation}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><Sparkles className="size-5" /></span>
                  <SectionTitle title="Intervention" description="Generated from this prediction's risk tier and top risk factors" />
                </div>

                {openIntervention ? (
                  <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Pill tone={riskTone(openIntervention.tier)}>{openIntervention.tier}</Pill>
                      <span className="font-semibold uppercase tracking-wide">{openIntervention.status.replace('_', ' ')}</span>
                      <span>· opened {new Date(openIntervention.createdAt).toLocaleDateString()}</span>
                    </div>
                    <ul className="space-y-2">
                      {openIntervention.recommendedActions.map((action) => (
                        <li key={action} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />{action}
                        </li>
                      ))}
                    </ul>
                    {openIntervention.notes ? (
                      <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300"><b>Saved note:</b> {openIntervention.notes}</p>
                    ) : null}
                    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
                      <label className="block">
                        <span className="text-sm font-bold">Advisor note</span>
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-transparent px-4 py-3 text-sm outline-none focus:border-[#003152] focus:ring-4 focus:ring-[#ADDFF1]/30 dark:border-slate-700"
                          placeholder={`Contact ${selectedStudent?.name} to discuss the identified risk factors and agree on an initial support plan.`}
                        />
                      </label>
                      <div className="flex items-end">
                        <Button
                          onClick={() => noteMutation.mutate({ interventionId: openIntervention.id, studentId: openIntervention.studentId, notes: noteDraft })}
                          disabled={noteMutation.isPending || !noteDraft}
                          className="w-full lg:w-auto"
                        >
                          <CheckCircle2 size={17} />{noteMutation.isPending ? 'Saving…' : openIntervention.notes ? 'Replace note' : 'Save note'}
                        </Button>
                      </div>
                    </div>
                    {noteSavedForActive ? (
                      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                        <p><b>Note saved.</b></p>
                      </div>
                    ) : null}
                    {noteErrorForActive ? (
                      <p className="mt-4 text-sm text-red-600 dark:text-red-300" role="alert">Could not save note: {noteErrorForActive}</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-6">
                    <Button
                      onClick={() => interventionMutation.mutate({ studentId: latestPrediction.studentId, predictionId: latestPrediction.id })}
                      disabled={interventionMutation.isPending || studentInterventionsQuery.isLoading}
                    >
                      <CheckCircle2 size={17} />{interventionMutation.isPending ? 'Creating…' : 'Create intervention'}
                    </Button>
                    {interventionError ? (
                      <p className="mt-3 text-sm text-red-600 dark:text-red-300" role="alert">Could not create intervention: {interventionError}</p>
                    ) : null}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No prediction on record for this student yet — click "Run AI prediction" above.
            </Card>
          )}
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 text-amber-500" />
          <div>
            <p className="font-bold">Responsible use notice</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">The prediction supports professional judgement; it must not be used as the sole basis for a decision about a student.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
