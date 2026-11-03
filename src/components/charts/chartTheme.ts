import { useTheme } from '@/contexts/ThemeContext';

/** Risk-tier colours keep their meaning everywhere: red = High, amber = Medium, green = Low. */
export const RISK_GRADIENTS = {
  HIGH: { from: '#ff8a8a', to: '#e5394b', solid: '#ef4444' },
  MEDIUM: { from: '#fde68a', to: '#f59e0b', solid: '#f59e0b' },
  LOW: { from: '#6ee7b7', to: '#10b981', solid: '#10b981' },
} as const;

/** Axis, grid and tooltip styling for Recharts that follows the light/dark theme. */
export function useChartTheme() {
  const dark = useTheme().theme === 'dark';
  const text = dark ? '#e3eef5' : '#0f172a';
  return {
    dark,
    grid: dark ? 'rgba(173,223,241,.08)' : '#e2e8f0',
    tick: { fill: dark ? '#84a2b8' : '#64748b', fontSize: 12 },
    tooltip: {
      contentStyle: {
        borderRadius: 14,
        border: `1px solid ${dark ? 'rgba(173,223,241,.16)' : '#e2e8f0'}`,
        background: dark ? 'rgba(6,22,36,.94)' : '#ffffff',
        boxShadow: '0 18px 50px rgba(0,0,0,.25)',
        color: text,
      },
      itemStyle: { color: text },
      labelStyle: { color: dark ? '#a9c3d4' : '#475569', fontWeight: 600 },
      cursor: { fill: dark ? 'rgba(173,223,241,.06)' : 'rgba(0,49,82,.05)' },
    },
    legend: { color: dark ? '#a9c3d4' : '#475569', fontSize: 12 },
  };
}
