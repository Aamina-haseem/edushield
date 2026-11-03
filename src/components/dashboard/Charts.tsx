import { ActionFunnel } from '@/components/charts/ActionFunnel';
import { RiskRing } from '@/components/charts/RiskRing';
import { Card } from '@/components/ui/Card';
import type { AnalyticsSummary } from '@/services/dashboard';

function Header({ title, sub }: { title: string; sub: string }) {
  return <div><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</p></div>;
}

export function Charts({ summary }: { summary: AnalyticsSummary }) {
  const { HIGH, MEDIUM, LOW } = summary.riskDistribution;
  const status = (key: string) => summary.interventionsByStatus[key] ?? 0;
  const plans = Object.values(summary.interventionsByStatus).reduce((sum, count) => sum + count, 0);

  const stages = [
    { label: 'Assessed', value: HIGH + MEDIUM + LOW },
    { label: 'At risk', value: HIGH + MEDIUM, hint: 'High + Medium' },
    { label: 'Support plans', value: plans },
    { label: 'Started', value: status('in_progress') + status('completed') },
    { label: 'Completed', value: status('completed') },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <Card className="p-5 sm:p-6 xl:col-span-5">
        <Header title="Risk distribution" sub="Students with a recorded prediction, by current risk tier" />
        <div className="mt-4"><RiskRing distribution={summary.riskDistribution} /></div>
      </Card>
      <Card className="p-5 sm:p-6 xl:col-span-7">
        <Header title="From prediction to action" sub="Assessed students through to completed support plans" />
        <ActionFunnel stages={stages} />
        <p className="mt-3 text-xs text-slate-400">
          {plans === 0 ? 'No support plans recorded yet. ' : ''}Band height uses a square-root scale so the smaller stages stay visible.
        </p>
      </Card>
    </div>
  );
}
