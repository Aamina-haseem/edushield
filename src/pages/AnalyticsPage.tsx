import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/Card';
import { PageHeader, SectionTitle, Stat } from '@/components/common/Page';
import { getAnalyticsOverview, getAnalyticsSummary, getModelInfo } from '@/services/dashboard';

const RISK_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' } as const;
const STATUS_COLORS = { pending: '#94a3b8', in_progress: '#0ea5e9', completed: '#10b981' } as const;
const tooltipStyle = { borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 18px 50px rgba(15,23,42,.12)' };
const pct = (value: number) => Math.round(value * 1000) / 10;
const MODEL_NAMES: Record<string, string> = {
  logistic_regression: 'Logistic Regression',
  decision_tree: 'Decision Tree',
  random_forest: 'Random Forest',
  xgboost: 'XGBoost',
};

function ChartCard({ title, description, children, height = 300 }: { title: string; description: string; children: React.ReactElement; height?: number }) {
  return (
    <Card className="p-6">
      <SectionTitle title={title} description={description} />
      <div className="mt-5" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </Card>
  );
}

export function AnalyticsPage() {
  const summaryQuery = useQuery({ queryKey: ['analytics-summary'], queryFn: getAnalyticsSummary });
  const overviewQuery = useQuery({ queryKey: ['analytics-overview'], queryFn: getAnalyticsOverview });
  const modelQuery = useQuery({ queryKey: ['model-info'], queryFn: getModelInfo });

  if (summaryQuery.isLoading || overviewQuery.isLoading || modelQuery.isLoading) {
    return <div className="grid min-h-[50vh] place-items-center text-slate-500 dark:text-slate-400">Loading analytics…</div>;
  }
  if (!summaryQuery.data || !overviewQuery.data || !modelQuery.data) {
    return <div className="grid min-h-[50vh] place-items-center text-slate-500 dark:text-slate-400">Unable to load analytics right now.</div>;
  }

  const summary = summaryQuery.data;
  const overview = overviewQuery.data;
  const model = modelQuery.data;
  const assessed = summary.riskDistribution.HIGH + summary.riskDistribution.MEDIUM + summary.riskDistribution.LOW;
  const openInterventions = (summary.interventionsByStatus.pending ?? 0) + (summary.interventionsByStatus.in_progress ?? 0);

  const absenceData = overview.absenceBands.map((b) => ({ ...b, highRiskShare: b.students ? Math.round((b.highRisk / b.students) * 1000) / 10 : 0 }));
  const modelComparison = Object.entries(model.cvMetrics ?? {}).map(([name, m]) => ({
    model: MODEL_NAMES[name] ?? name,
    F1: pct(m.f1),
    Recall: pct(m.recall),
    'ROC AUC': pct(m.roc_auc),
  }));
  // Most inputs first: the API's JSON key order is alphabetical, not the order the grades are removed in.
  const sensitivity = Object.entries(model.gradeSensitivityCv ?? {}).sort(([, a], [, b]) => b.f1 - a.f1);
  const interventionsByTier = overview.interventionsByTier.filter((t) => t.pending + t.in_progress + t.completed > 0);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Institutional intelligence"
        title="Analytics"
        description="Where risk concentrates, what drives it, how interventions are progressing and how well the model performs — all from live data."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Students assessed" value={`${assessed} / ${summary.totalStudents}`} note="Students with a prediction on record" />
        <Stat label="High-risk share" value={`${assessed ? Math.round((summary.riskDistribution.HIGH / assessed) * 1000) / 10 : 0}%`} note={`${summary.riskDistribution.HIGH} students in the HIGH tier`} />
        <Stat label="Open interventions" value={String(openInterventions)} note={`${summary.interventionsByStatus.completed ?? 0} completed`} />
        <Stat label="Model F1 (test split)" value={`${pct(model.metrics.f1)}%`} note={`${model.modelVersion} · recall ${model.metrics.recall !== undefined ? pct(model.metrics.recall) : '—'}%`} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Risk tier by programme" description="Latest prediction per student">
          <BarChart data={overview.byProgramme} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="group" width={170} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="HIGH" stackId="tier" fill={RISK_COLORS.HIGH} />
            <Bar dataKey="MEDIUM" stackId="tier" fill={RISK_COLORS.MEDIUM} />
            <Bar dataKey="LOW" stackId="tier" fill={RISK_COLORS.LOW} radius={[0, 8, 8, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Strongest risk drivers" description="How often each factor is the top SHAP risk-increaser, HIGH and MEDIUM students">
          <BarChart data={overview.topRiskDrivers} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="feature" width={170} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} students`, 'Top driver for']} />
            <Bar dataKey="students" fill="#0284c7" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="High-risk share by absence count" description="Percentage of students in each absence band who are in the HIGH tier">
          <BarChart data={absenceData}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="band" label={{ value: 'Recorded absences', position: 'insideBottom', offset: -4 }} height={44} />
            <YAxis unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={(value, _name, item) => [`${value}% (${item.payload.highRisk} of ${item.payload.students})`, 'High risk']} />
            <Bar dataKey="highRiskShare" fill={RISK_COLORS.HIGH} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Interventions by tier and status" description="Every support plan on record">
          <BarChart data={interventionsByTier}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="tier" />
            <YAxis allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="pending" stackId="status" name="Pending" fill={STATUS_COLORS.pending} />
            <Bar dataKey="in_progress" stackId="status" name="In progress" fill={STATUS_COLORS.in_progress} />
            <Bar dataKey="completed" stackId="status" name="Completed" fill={STATUS_COLORS.completed} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <ChartCard title="Model comparison" description="Mean of 5 grouped cross-validation folds on the training split — how the deployed model was chosen" height={320}>
          <BarChart data={modelComparison}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="model" />
            <YAxis unit="%" domain={[0, 100]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${value}%`} />
            <Legend />
            <Bar dataKey="F1" fill="#0284c7" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Recall" fill="#7dd3fc" radius={[6, 6, 0, 0]} />
            <Bar dataKey="ROC AUC" fill="#94a3b8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <Card className="p-6">
          <SectionTitle title="How much the grades carry" description={`${MODEL_NAMES[model.modelType] ?? model.modelType}, cross-validated, with term grades removed`} />
          <table className="mt-5 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                <th className="py-2">Inputs</th><th>F1</th><th>Recall</th><th>AUC</th>
              </tr>
            </thead>
            <tbody>
              {sensitivity.map(([label, m]) => (
                <tr key={label} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-3 pr-3">{label}</td>
                  <td className="font-bold">{pct(m.f1)}%</td>
                  <td>{pct(m.recall)}%</td>
                  <td>{pct(m.roc_auc)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Label: {model.labelDefinition ?? 'not recorded'}. Without the second-term grade the warning comes earlier in the year but is less accurate — a trade-off to weigh when deciding when to run predictions.
          </p>
        </Card>
      </div>
    </div>
  );
}
