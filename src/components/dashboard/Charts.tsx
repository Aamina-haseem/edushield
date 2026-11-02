import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/Card';
import type { AnalyticsSummary } from '@/services/dashboard';

const tooltipStyle = { borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 18px 50px rgba(15,23,42,.12)' };
const RISK_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' } as const;
const STATUS_COLORS: Record<string, string> = { pending: '#94a3b8', in_progress: '#0ea5e9', completed: '#10b981' };

function Header({ title, sub }: { title: string; sub: string }) {
  return <div><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</p></div>;
}

export function Charts({ summary }: { summary: AnalyticsSummary }) {
  const riskDistribution = (['HIGH', 'MEDIUM', 'LOW'] as const).map((tier) => ({
    name: tier.charAt(0) + tier.slice(1).toLowerCase(),
    value: summary.riskDistribution[tier],
    fill: RISK_COLORS[tier],
  }));
  const monitored = riskDistribution.reduce((sum, r) => sum + r.value, 0);

  const statusData = Object.entries(summary.interventionsByStatus).map(([status, count]) => ({
    status: status.replace('_', ' '),
    count,
    fill: STATUS_COLORS[status] ?? '#64748b',
  }));

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <Card className="p-5 sm:p-6 xl:col-span-7">
        <Header title="Risk distribution" sub="Students with a recorded prediction, by current risk tier" />
        <div className="relative mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={riskDistribution} dataKey="value" innerRadius={72} outerRadius={100} paddingAngle={5} cornerRadius={8}>
                {riskDistribution.map((item) => <Cell key={item.name} fill={item.fill} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div><p className="text-3xl font-bold">{monitored}</p><p className="text-xs text-slate-400">assessed</p></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {riskDistribution.map((item) => (
            <div key={item.name} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800">
              <span className="mx-auto block size-2 rounded-full" style={{ background: item.fill }} />
              <p className="mt-1 text-lg font-bold">{item.value}</p>
              <p className="text-xs text-slate-400">{item.name}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5 sm:p-6 xl:col-span-5">
        <Header title="Intervention status" sub="Current support-plan caseload" />
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="status" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {statusData.map((item) => <Cell key={item.status} fill={item.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {statusData.length === 0 && <p className="text-center text-sm text-slate-500 dark:text-slate-400">No interventions recorded yet.</p>}
      </Card>
    </div>
  );
}
