import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileBarChart, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader, Pill, SectionTitle, Stat } from '@/components/common/Page';
import type { ApiError } from '@/services/api-client';
import { downloadCsv, generateReport, getReport, listReports, REPORT_LABELS, type ReportType } from '@/services/reports';

const PREVIEW_ROWS = 8;

export function ReportsPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<ReportType>('student_risk_summary');
  const reportsQuery = useQuery({ queryKey: ['reports'], queryFn: listReports });

  const generateMutation = useMutation({
    mutationFn: generateReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
  const downloadMutation = useMutation({
    mutationFn: getReport,
    onSuccess: (report) => downloadCsv(report.content, report.createdAt),
  });

  const history = reportsQuery.data?.history ?? [];
  const latest = generateMutation.data;
  const thisMonth = history.filter((r) => r.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7)).length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Evidence and exports"
        title="Reports"
        description="Generate reports from live data, preview them, and download them as CSV for Excel or further analysis. Every generated report is kept so it can be downloaded again."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Reports generated" value={String(history.length)} note="Most recent 50 kept in the library" />
        <Stat label="This month" value={String(thisMonth)} note="Generated since the 1st" />
        <Stat label="Report types" value={String(Object.keys(REPORT_LABELS).length)} note="Risk, interventions, model" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card className="h-fit p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-sky-100 text-[#003152]"><FileBarChart /></span>
            <div><h2 className="font-bold">Report builder</h2><p className="text-sm text-slate-500">Built from the current database state</p></div>
          </div>
          <div className="mt-5 space-y-3">
            {(Object.keys(REPORT_LABELS) as ReportType[]).map((key) => (
              <label key={key} className={`block cursor-pointer rounded-2xl border p-4 ${type === key ? 'border-[#003152] bg-sky-50/60 dark:border-sky-400 dark:bg-sky-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="report-type" checked={type === key} onChange={() => setType(key)} className="accent-[#003152]" />
                  <span className="font-semibold">{REPORT_LABELS[key].title}</span>
                </div>
                <p className="mt-1 pl-7 text-xs text-slate-500">{REPORT_LABELS[key].description}</p>
              </label>
            ))}
            <Button className="w-full" onClick={() => generateMutation.mutate(type)} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? 'Generating…' : 'Generate report'}
            </Button>
            {generateMutation.isError && <p className="text-sm text-red-600 dark:text-red-300" role="alert">{(generateMutation.error as ApiError).message}</p>}
          </div>
        </Card>

        <Card className="p-6">
          {latest ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionTitle title={latest.content.title} description={`${latest.rowCount} rows · generated ${new Date(latest.createdAt).toLocaleString()}`} />
                <Button variant="secondary" icon={<Download size={15} />} onClick={() => downloadCsv(latest.content, latest.createdAt)}>Download CSV</Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(latest.content.summary).map(([label, value]) => <Pill key={label} tone="blue">{label}: {value}</Pill>)}
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                      {latest.content.columns.map((col) => <th key={col} className="px-2 py-2">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {latest.content.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                        {latest.content.columns.map((col) => <td key={col} className="max-w-[260px] truncate px-2 py-2">{String(row[col] ?? '—')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {latest.rowCount > PREVIEW_ROWS && <p className="mt-3 text-xs text-slate-500">Preview shows the first {PREVIEW_ROWS} rows; the CSV contains all {latest.rowCount}.</p>}
            </>
          ) : (
            <div className="grid min-h-[220px] place-items-center text-center text-sm text-slate-500 dark:text-slate-400">
              Choose a report type and generate it to preview it here.
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <SectionTitle title="Report library" description="Previously generated reports, newest first" />
        <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {reportsQuery.isLoading && <p className="py-4 text-sm text-slate-500">Loading reports…</p>}
          {history.map((report) => (
            <div key={report.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800"><FileSpreadsheet size={20} /></span>
                <div>
                  <p className="font-bold">{REPORT_LABELS[report.type].title}</p>
                  <p className="text-xs text-slate-500">{new Date(report.createdAt).toLocaleString()} · {report.generatedByName ?? 'Unknown user'} · {report.rowCount} rows</p>
                </div>
              </div>
              <Button
                variant="secondary"
                icon={<Download size={15} />}
                onClick={() => downloadMutation.mutate(report.id)}
                disabled={downloadMutation.isPending && downloadMutation.variables === report.id}
              >
                CSV
              </Button>
            </div>
          ))}
          {!reportsQuery.isLoading && history.length === 0 && <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No reports generated yet.</p>}
        </div>
      </Card>
    </div>
  );
}
