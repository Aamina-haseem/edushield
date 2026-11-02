import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';

export interface DashboardMetric {
  label: string;
  value: string;
  note: string;
  tone: 'primary' | 'danger' | 'warning' | 'success' | 'info';
}

const tones = { primary: '#003152', danger: '#ef4444', warning: '#f59e0b', success: '#10b981', info: '#0ea5e9' };

export function MetricCard({ metric, index }: { metric: DashboardMetric; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} whileHover={{ y: -4 }}>
      <Card className="p-5">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: tones[metric.tone] }}>{metric.value}</p>
        <p className="mt-3 text-xs text-slate-400">{metric.note}</p>
      </Card>
    </motion.div>
  );
}
