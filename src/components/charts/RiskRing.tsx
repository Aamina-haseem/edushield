import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { RISK_GRADIENTS, useChartTheme } from '@/components/charts/chartTheme';

type Tier = keyof typeof RISK_GRADIENTS;
const TIERS: Tier[] = ['HIGH', 'MEDIUM', 'LOW'];
const label = (tier: Tier) => tier.charAt(0) + tier.slice(1).toLowerCase();

/** Segmented ring of the risk tiers with the total in the centre and a legend of counts and shares. */
export function RiskRing({ distribution }: { distribution: Record<Tier, number> }) {
  const chart = useChartTheme();
  const data = TIERS.map((tier) => ({ tier, name: label(tier), value: distribution[tier] }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <div className="relative h-60 dark:[&_svg]:drop-shadow-[0_0_22px_rgba(44,196,214,.18)]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {TIERS.map((tier) => (
                <linearGradient key={tier} id={`ring-${tier}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={RISK_GRADIENTS[tier].from} />
                  <stop offset="100%" stopColor={RISK_GRADIENTS[tier].to} />
                </linearGradient>
              ))}
            </defs>
            {/* Radii are percentages of the available space, so the ring always fits its card. */}
            <Pie data={[{ value: 1 }]} dataKey="value" innerRadius="80%" outerRadius="97%" fill={chart.dark ? 'rgba(173,223,241,.06)' : '#eef5f9'} stroke="none" isAnimationActive={false} />
            <Pie data={data} dataKey="value" innerRadius="82%" outerRadius="95%" paddingAngle={4} cornerRadius={10} startAngle={90} endAngle={-270} stroke="none">
              {data.map((d) => <Cell key={d.tier} fill={`url(#ring-${d.tier})`} />)}
            </Pie>
            <Tooltip {...chart.tooltip} formatter={(value) => [`${value} students`, '']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-4xl font-extrabold tracking-tight text-[#003152] dark:text-white">{total.toLocaleString()}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">students assessed</p>
          </div>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-3">
        {data.map((d) => (
          <li key={d.tier} className="rounded-2xl border border-slate-200/70 px-3 py-3 text-center dark:border-white/8 dark:bg-white/[.03]">
            <span className="mx-auto block size-3 rounded-full ring-4 ring-slate-100 dark:ring-white/5" style={{ background: `linear-gradient(135deg, ${RISK_GRADIENTS[d.tier].from}, ${RISK_GRADIENTS[d.tier].to})` }} />
            <p className="font-display mt-2 text-xl font-bold">{d.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{d.name} · {total ? Math.round((d.value / total) * 1000) / 10 : 0}%</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
