import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarList } from '@/components/charts/BarList';
import { RISK_GRADIENTS, useChartTheme } from '@/components/charts/chartTheme';
import { PlanFlow } from '@/components/charts/PlanFlow';
import { Card } from '@/components/ui/Card';
import { PageHeader, SectionTitle, Stat } from '@/components/common/Page';
import { getAnalyticsOverview, getAnalyticsSummary, getModelInfo } from '@/services/dashboard';

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

/** Vertical gradients shared by the bar charts below, passed as a plain <defs> element so Recharts renders it. */
const gradientStops = (id: string, from: string, to: string) => (
  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={from} />
    <stop offset="100%" stopColor={to} />
  </linearGradient>
);
const barGradients = (
  <defs>
    {gradientStops('an-high', RISK_GRADIENTS.HIGH.from, RISK_GRADIENTS.HIGH.to)}
    {gradientStops('an-medium', RISK_GRADIENTS.MEDIUM.from, RISK_GRADIENTS.MEDIUM.to)}
    {gradientStops('an-low', RISK_GRADIENTS.LOW.from, RISK_GRADIENTS.LOW.to)}
    {gradientStops('an-f1', '#ADDFF1', '#2cc4d6')}
    {gradientStops('an-recall', '#5b9fe0', '#1d4f86')}
    {gradientStops('an-auc', '#a9c3d4', '#5f7f97')}
  </defs>
);

export function AnalyticsPage() {
  const chart = useChartTheme();
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
  const axis = { axisLine: false, tickLine: false, tick: chart.tick } as const;

  const absenceData = overview.absenceBands.map((b) => ({ ...b, highRiskShare: b.students ? Math.round((b.highRisk / b.students) * 1000) / 10 : 0 }));
  const modelComparison = Object.entries(model.cvMetrics ?? {}).map(([name, m]) => ({
    model: MODEL_NAMES[name] ?? name,
    F1: pct(m.f1),
    Recall: pct(m.recall),
    'ROC AUC': pct(m.roc_auc),
  }));
  // Most inputs first: the API's JSON key order is alphabetical, not the order the grades are removed in.
  const sensitivity = Object.entries(model.gradeSensitivityCv ?? {}).sort(([, a], [, b]) => b.f1 - a.f1);
  const drivers = overview.topRiskDrivers.map((d) => ({ label: d.feature, value: d.students }));

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
          <BarChart data={overview.byProgramme} layout="vertical" margin={{ left: 0, right: 16 }} barSize={16}>
            {barGradients}
            <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke={chart.grid} />
            <XAxis type="number" allowDecimals={false} {...axis} />
            <YAxis type="category" dataKey="group" width={150} {...axis} />
            <Tooltip {...chart.tooltip} />
            <Legend wrapperStyle={chart.legend} iconType="circle" />
            <Bar dataKey="HIGH" name="High" stackId="tier" fill="url(#an-high)" />
            <Bar dataKey="MEDIUM" name="Medium" stackId="tier" fill="url(#an-medium)" />
            <Bar dataKey="LOW" name="Low" stackId="tier" fill="url(#an-low)" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ChartCard>

        <Card className="p-6">
          <SectionTitle title="Strongest risk drivers" description="How often each factor is the top SHAP risk-increaser, HIGH and MEDIUM students" />
          <div className="mt-6"><BarList items={drivers} /></div>
          {drivers[0] && (
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-white">{drivers[0].label}</span> is the most frequent top driver, for {drivers[0].value} students.
            </p>
          )}
        </Card>

        <ChartCard title="High-risk share by absence count" description="Percentage of students in each absence band who are in the HIGH tier">
          <BarChart data={absenceData} barSize={34}>
            {barGradients}
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={chart.grid} />
            <XAxis dataKey="band" {...axis} label={{ value: 'Recorded absences', position: 'insideBottom', offset: -4, fill: chart.tick.fill, fontSize: 12 }} height={44} />
            <YAxis unit="%" {...axis} />
            <Tooltip {...chart.tooltip} formatter={(value, _name, item) => [`${value}% (${item.payload.highRisk} of ${item.payload.students})`, 'High risk']} />
            <Bar dataKey="highRiskShare" fill="url(#an-high)" radius={[10, 10, 4, 4]} />
          </BarChart>
        </ChartCard>

        <PlanFlow byTier={overview.interventionsByTier} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <ChartCard title="Model comparison" description="Mean of 5 grouped cross-validation folds on the training split — how the deployed model was chosen" height={320}>
          <BarChart data={modelComparison} barGap={6}>
            {barGradients}
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={chart.grid} />
            <XAxis dataKey="model" {...axis} />
            <YAxis unit="%" domain={[0, 100]} {...axis} />
            <Tooltip {...chart.tooltip} formatter={(value) => `${value}%`} />
            <Legend wrapperStyle={chart.legend} iconType="circle" />
            <Bar dataKey="F1" fill="url(#an-f1)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Recall" fill="url(#an-recall)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="ROC AUC" fill="url(#an-auc)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>

        <Card className="p-6">
          <SectionTitle title="How much the grades carry" description={`${MODEL_NAMES[model.modelType] ?? model.modelType}, cross-validated, with term grades removed`} />
          <table className="mt-5 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                <th className="py-2">Inputs</th><th className="px-2">F1</th><th className="px-2">Recall</th><th className="px-2">AUC</th>
              </tr>
            </thead>
            <tbody>
              {sensitivity.map(([label, m]) => (
                <tr key={label} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-3 pr-3">{label}</td>
                  <td className="px-2 font-bold">{pct(m.f1)}%</td>
                  <td className="px-2">{pct(m.recall)}%</td>
                  <td className="px-2">{pct(m.roc_auc)}%</td>
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
