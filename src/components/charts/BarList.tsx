export interface BarListItem { label: string; value: number }

/** Ranked rows with a label, a value and a glowing progress bar (scaled to the largest value). */
export function BarList({ items, unit = '', gradient = 'linear-gradient(90deg,#1d4f86,#2cc4d6,#5ff0c8)' }: { items: BarListItem[]; unit?: string; gradient?: string }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
            <span className="font-display shrink-0 font-bold">{item.value.toLocaleString()}{unit}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[.06]">
            <div className="h-full rounded-full dark:shadow-[0_0_14px_rgba(44,196,214,.45)]" style={{ width: `${(item.value / max) * 100}%`, background: gradient }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
