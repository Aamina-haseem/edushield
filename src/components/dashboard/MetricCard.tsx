import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';

export interface DashboardMetric {
  label: string;
  value: string;
  note: string;
  tone: 'primary' | 'danger' | 'warning' | 'success' | 'info';
}

// Class-based so each tone stays readable on both the white and the glass card.
const tones = {
  primary: { text: 'text-[#003152] dark:text-[#ADDFF1]', bar: 'from-[#003152] to-[#2cc4d6] dark:from-[#ADDFF1] dark:to-[#2cc4d6]' },
  danger: { text: 'text-red-500 dark:text-red-400', bar: 'from-red-400 to-rose-600' },
  warning: { text: 'text-amber-500 dark:text-amber-300', bar: 'from-amber-300 to-amber-500' },
  success: { text: 'text-emerald-600 dark:text-emerald-400', bar: 'from-emerald-300 to-emerald-500' },
  info: { text: 'text-sky-600 dark:text-sky-300', bar: 'from-sky-300 to-cyan-500' },
};

export function MetricCard({ metric, index }: { metric: DashboardMetric; index: number }) {
  const tone = tones[metric.tone];
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} whileHover={{ y: -4 }}>
      <Card className="p-5">
        <span className={`block h-1 w-10 rounded-full bg-gradient-to-r ${tone.bar}`} />
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
        <p className={`font-display mt-1 text-4xl font-extrabold tracking-tight ${tone.text}`}>{metric.value}</p>
        <p className="mt-3 text-xs text-slate-400">{metric.note}</p>
      </Card>
    </motion.div>
  );
}
