import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface FunnelStage { label: string; value: number; hint?: string }

const W = 1000;
const H = 200;
const MID = H / 2;
const MAX_HALF = 88;
const MIN_HALF = 7;

/**
 * Smooth gradient funnel (one column per stage). Band height uses a square-root scale so
 * stages that are small next to the first one stay visible; the exact counts sit above each column.
 */
export function ActionFunnel({ stages }: { stages: FunnelStage[] }) {
  const gradientId = `funnel-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const n = stages.length;
  const max = Math.max(1, ...stages.map((s) => s.value));
  const col = W / n;
  const half = stages.map((s) => MIN_HALF + (MAX_HALF - MIN_HALF) * Math.sqrt(Math.max(0, s.value) / max));

  // Each stage is flat across most of its column, then curves into the next stage's height.
  function shape(pad: number) {
    const start = (i: number) => (i === 0 ? 0 : i * col + col * 0.08);
    const end = (i: number) => (i === n - 1 ? W : i * col + col * 0.42);
    const top = (i: number) => MID - half[i] - pad;
    const bottom = (i: number) => MID + half[i] + pad;
    let d = `M${start(0)},${top(0)}`;
    for (let i = 0; i < n; i++) {
      d += ` L${end(i)},${top(i)}`;
      if (i < n - 1) d += ` C${end(i) + col * 0.3},${top(i)} ${start(i + 1) - col * 0.3},${top(i + 1)} ${start(i + 1)},${top(i + 1)}`;
    }
    d += ` L${end(n - 1)},${bottom(n - 1)}`;
    for (let i = n - 1; i >= 0; i--) {
      d += ` L${start(i)},${bottom(i)}`;
      if (i > 0) d += ` C${start(i) - col * 0.3},${bottom(i)} ${end(i - 1) + col * 0.3},${bottom(i - 1)} ${end(i - 1)},${bottom(i - 1)}`;
    }
    return `${d} Z`;
  }

  return (
    <div className="relative mt-5">
      <svg className="absolute inset-x-0 bottom-0 h-[170px] w-full dark:drop-shadow-[0_0_24px_rgba(44,196,214,.25)]" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0a2a4a" />
            <stop offset="32%" stopColor="#1d4f86" />
            <stop offset="62%" stopColor="#2b8fd6" />
            <stop offset="82%" stopColor="#2cc4d6" />
            <stop offset="100%" stopColor="#5ff0c8" />
          </linearGradient>
        </defs>
        <path d={shape(9)} fill={`url(#${gradientId})`} opacity={0.28} />
        <path d={shape(0)} fill={`url(#${gradientId})`} />
      </svg>
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {stages.map((stage, i) => (
          <div key={stage.label} className={cn('h-[250px] px-2 sm:px-3', i > 0 && 'border-l border-dashed border-slate-300 dark:border-white/12')}>
            <p className="text-[11px] font-medium leading-4 text-slate-500 sm:text-xs dark:text-slate-400">{stage.label}</p>
            <p className="font-display mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{stage.value.toLocaleString()}</p>
            {stage.hint && <p className="text-[11px] text-slate-400">{stage.hint}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
