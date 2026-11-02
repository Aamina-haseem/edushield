import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { ModelInfo } from '@/services/dashboard';
import { getSystemStatus } from '@/services/system';

export function ModelStatus({ modelInfo, totalStudents }: { modelInfo: ModelInfo; totalStudents: number }) {
  const statusQuery = useQuery({ queryKey: ['system-status'], queryFn: getSystemStatus, refetchInterval: 60_000 });
  const online = statusQuery.data?.mlService === true;
  const metrics: [string, number][] = [
    ['Test accuracy', Math.round(modelInfo.metrics.accuracy * 1000) / 10],
    ['F1 score', Math.round(modelInfo.metrics.f1 * 1000) / 10],
    ['AUC-ROC', Math.round(modelInfo.metrics.auc_roc * 1000) / 10],
  ];

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">AI model status</p>
          <h3 className="mt-2 text-xl font-bold capitalize">{modelInfo.modelType.replace('_', ' ')} Risk Classifier</h3>
          <p className="mt-1 text-sm text-slate-500">Explanation engine: SHAP</p>
        </div>
        {online ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 size={14} />Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <XCircle size={14} />{statusQuery.isLoading ? 'Checking' : 'Offline'}
          </span>
        )}
      </div>
      <div className="mt-6 space-y-4">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{label}</span>
              <strong>{value}%</strong>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-[#003152] dark:bg-[#ADDFF1]" style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 text-center dark:border-slate-800">
        <div><p className="font-bold">{totalStudents.toLocaleString()}</p><p className="text-xs text-slate-400">Dataset</p></div>
        <div><p className="font-bold">{modelInfo.modelVersion}</p><p className="text-xs text-slate-400">Version</p></div>
      </div>
    </Card>
  );
}
