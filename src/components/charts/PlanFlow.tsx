import { useId } from 'react';
import { ArrowUpRight, CircleCheck, Clock3, Info, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useChartTheme } from '@/components/charts/chartTheme';
import { Card } from '@/components/ui/Card';
import type { AnalyticsOverview } from '@/services/dashboard';

type Tier = 'HIGH' | 'MEDIUM' | 'LOW';
type Status = 'pending' | 'in_progress' | 'completed';

const TIERS: { key: Tier; label: string; color: string }[] = [
  { key: 'HIGH', label: 'High risk', color: '#ff9a9a' },
  { key: 'MEDIUM', label: 'Medium risk', color: '#f8d77a' },
  { key: 'LOW', label: 'Low risk', color: '#7ee2b5' },
];
const STATUSES: { key: Status; label: string; color: string; icon: typeof Clock3 }[] = [
  { key: 'pending', label: 'Pending', color: '#b9a7f5', icon: Clock3 },
  { key: 'in_progress', label: 'In progress', color: '#6fd8e6', icon: LoaderCircle },
  { key: 'completed', label: 'Completed', color: '#8be3a5', icon: CircleCheck },
];

const H = 252; // body height in px; the ribbon SVG uses the same vertical units
const ROW = H / 3;
const BAND_GAP = 3;

/**
 * Interventions by tier and status: risk tier on the left, plan status on the right, joined by
 * ribbons whose thickness follows the number of plans. Styled after a spending-overview card.
 */
export function PlanFlow({ byTier }: { byTier: AnalyticsOverview['interventionsByTier'] }) {
  const chart = useChartTheme();
  const idPrefix = `plan-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const counts = (tier: Tier) => byTier.find((t) => t.tier === tier) ?? { pending: 0, in_progress: 0, completed: 0 };

  const links = TIERS.flatMap((tier, s) => STATUSES.map((status, t) => ({ s, t, value: counts(tier.key)[status.key] }))).filter((l) => l.value > 0);
  const tierTotals = TIERS.map((tier) => STATUSES.reduce((sum, status) => sum + counts(tier.key)[status.key], 0));
  const statusTotals = STATUSES.map((_, t) => links.filter((l) => l.t === t).reduce((sum, l) => sum + l.value, 0));
  const total = tierTotals.reduce((a, b) => a + b, 0);
  const open = statusTotals[0] + statusTotals[1];
  const share = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  // Ribbon thickness grows with the number of plans; ribbons leaving (or reaching) the same row stack side by side.
  const maxValue = Math.max(1, ...links.map((l) => l.value));
  const thickness = (value: number) => 8 + 30 * (value / maxValue);
  function stackedCentres(side: 's' | 't', count: number) {
    const centres = new Map<(typeof links)[number], number>();
    for (let row = 0; row < count; row++) {
      const rowLinks = links.filter((l) => l[side] === row).sort((a, b) => (side === 's' ? a.t - b.t : a.s - b.s));
      const span = rowLinks.reduce((sum, l) => sum + thickness(l.value), 0) + BAND_GAP * Math.max(0, rowLinks.length - 1);
      let y = ROW * (row + 0.5) - span / 2;
      for (const l of rowLinks) {
        centres.set(l, y + thickness(l.value) / 2);
        y += thickness(l.value) + BAND_GAP;
      }
    }
    return centres;
  }
  const from = stackedCentres('s', TIERS.length);
  const to = stackedCentres('t', STATUSES.length);

  function ribbon(y1: number, y2: number, w: number) {
    const a = w / 2;
    return `M0,${y1 - a} L280,${y1 - a} C500,${y1 - a} 500,${y2 - a} 720,${y2 - a} L1000,${y2 - a} L1000,${y2 + a} L720,${y2 + a} C500,${y2 + a} 500,${y1 + a} 280,${y1 + a} L0,${y1 + a} Z`;
  }

  const topTier = tierTotals.indexOf(Math.max(...tierTotals));
  const panel = 'rounded-2xl bg-slate-100/80 dark:bg-white/[.05]';

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          Interventions by tier and status
          <span title="Every support plan on record, from the student's risk tier to where the plan stands now" className="text-slate-400"><Info size={16} /></span>
        </h3>
        <Link to="/interventions" aria-label="Open interventions" className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"><ArrowUpRight size={18} /></Link>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        {[
          ['Support plans', String(total)],
          ['Still open', String(open)],
          ['Completion rate', `${share(statusTotals[2])}%`],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="font-display mt-1 text-2xl font-semibold tracking-tight">{value}</dd>
          </div>
        ))}
      </dl>

      {total === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">No support plans recorded yet.</p>
      ) : (
        <div className="relative mt-6" style={{ height: H }}>
          {/* Left: share of plans per tier, and the tier label on a soft panel. */}
          <div className="absolute inset-y-0 left-0 grid w-16 grid-rows-3 gap-2">
            {TIERS.map((tier, i) => <div key={tier.key} className={`${panel} grid place-items-center font-display text-lg font-semibold`}>{share(tierTotals[i])}%</div>)}
          </div>
          <div className="absolute inset-y-0 left-[72px] grid w-[34%] grid-rows-3 gap-2">
            {TIERS.map((tier) => <div key={tier.key} className={panel} />)}
          </div>

          {/* Ribbons, drawn over the label panels and under the text. */}
          <svg className="absolute inset-y-0 left-[72px] h-full w-[calc(100%-72px-60px)]" viewBox={`0 0 1000 ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              {links.map((l, i) => (
                <linearGradient key={i} id={`${idPrefix}-${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={TIERS[l.s].color} />
                  <stop offset="100%" stopColor={STATUSES[l.t].color} />
                </linearGradient>
              ))}
            </defs>
            {links.map((l, i) => (
              <path key={i} d={ribbon(from.get(l)!, to.get(l)!, thickness(l.value))} fill={`url(#${idPrefix}-${i})`} opacity={chart.dark ? 0.66 : 0.6} style={{ mixBlendMode: chart.dark ? 'screen' : 'multiply' }} />
            ))}
          </svg>

          <div className="pointer-events-none absolute inset-y-0 left-[88px] grid grid-rows-3 gap-2">
            {TIERS.map((tier) => (
              <p key={tier.key} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="size-2 rounded-full" style={{ background: tier.color }} />{tier.label}
              </p>
            ))}
          </div>

          {/* Right: plans per status, and the status icon on its own tile. */}
          <div className="pointer-events-none absolute inset-y-0 right-[68px] grid grid-rows-3 gap-2 text-right">
            {STATUSES.map((status, t) => (
              <p key={status.key} className="flex flex-col items-end justify-center">
                <span className="font-display text-lg font-semibold">{statusTotals[t]}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{status.label}</span>
              </p>
            ))}
          </div>
          <div className="absolute inset-y-0 right-0 grid w-[52px] grid-rows-3 gap-2">
            {STATUSES.map(({ key, label, color, icon: Icon }) => (
              <div key={key} className={`${panel} grid place-items-center`}>
                <span className="grid size-9 place-items-center rounded-full bg-white shadow-sm" title={label}><Icon size={18} style={{ color }} strokeWidth={2.4} /></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {total > 0 && (
        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-white">{TIERS[topTier].label}</span> students hold {share(tierTotals[topTier])}% of support plans, and <span className="font-semibold text-slate-800 dark:text-white">{statusTotals[2]} of {total}</span> are completed.
        </p>
      )}
    </Card>
  );
}
