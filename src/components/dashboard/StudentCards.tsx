import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ApiError } from '@/services/api-client';
import type { StudentPrediction } from '@/services/predictions';
import { createIntervention } from '@/services/interventions';
import type { RiskTier } from '@/types/contract';

const riskStyles: Record<RiskTier, string> = {
  HIGH: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  LOW: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

interface StudentCardsProps {
  students: StudentPrediction[];
  /** Students who already have a non-completed intervention — their "Start intervention" is disabled. */
  openInterventionStudentIds: Set<string>;
}

export function StudentCards({ students, openInterventionStudentIds }: StudentCardsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const interventionMutation = useMutation({
    mutationFn: ({ studentId, predictionId }: { studentId: string; predictionId: string }) => createIntervention(studentId, predictionId),
    onSettled: (_data, _error, { studentId }) => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['student-interventions', studentId] });
    },
  });

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-xl font-bold">Priority students</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Highest-risk students by latest prediction</p>
        </div>
        <button className="text-sm font-semibold text-[#003152] dark:text-[#ADDFF1]" onClick={() => navigate('/students')}>View all students</button>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {students.map((student, index) => {
          const topFactor = student.shapFactors[0];
          const isCreating = interventionMutation.isPending && interventionMutation.variables?.studentId === student.studentId;
          const hasOpenIntervention = openInterventionStudentIds.has(student.studentId);
          const createError =
            interventionMutation.isError && interventionMutation.variables?.studentId === student.studentId && (interventionMutation.error as ApiError).status !== 409
              ? (interventionMutation.error as ApiError).message
              : null;
          return (
            <motion.div key={student.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
              <Card className="h-full p-5 sm:p-6">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#ADDFF1]/45 font-bold text-[#003152] dark:bg-[#ADDFF1]/15 dark:text-[#ADDFF1]">
                    {student.studentName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-bold">{student.studentName}</h4>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${riskStyles[student.riskTier]}`}>{student.riskTier} risk · {student.riskScore}%</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{student.studentNumber} · {student.programme}</p>
                  </div>
                </div>
                {topFactor && (
                  <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/30">
                    <p className="text-xs font-bold uppercase tracking-[.15em] text-[#003152] dark:text-[#ADDFF1]">Top SHAP factor: {topFactor.feature}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{topFactor.explanation}</p>
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-400">Evaluated {new Date(student.predictedAt).toLocaleString()}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="secondary" icon={<ArrowRight size={16} />} onClick={() => navigate(`/students/${student.studentId}`)}>View student</Button>
                  <Button
                    icon={<CalendarPlus size={16} />}
                    onClick={() => interventionMutation.mutate({ studentId: student.studentId, predictionId: student.id })}
                    disabled={isCreating || hasOpenIntervention}
                  >
                    {isCreating ? 'Creating…' : hasOpenIntervention ? 'Intervention active' : 'Start intervention'}
                  </Button>
                </div>
                {createError ? <p className="mt-3 text-sm text-red-600 dark:text-red-300" role="alert">Could not create intervention: {createError}</p> : null}
              </Card>
            </motion.div>
          );
        })}
        {students.length === 0 && (
          <Card className="p-6 text-sm text-slate-500 dark:text-slate-400 xl:col-span-2">No predictions on record yet — run one from the Predictions page.</Card>
        )}
      </div>
    </section>
  );
}
