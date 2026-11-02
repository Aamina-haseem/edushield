import { apiClient } from '@/services/api-client';

export type ReportType = 'student_risk_summary' | 'intervention_outcomes' | 'model_performance';

export const REPORT_LABELS: Record<ReportType, { title: string; description: string }> = {
  student_risk_summary: { title: 'Student risk summary', description: 'Every student with their latest risk score, tier and top risk factor.' },
  intervention_outcomes: { title: 'Intervention outcomes', description: 'All support plans with status, owner, meetings and notes.' },
  model_performance: { title: 'Model performance', description: 'Test-split metrics, cross-validation comparison and grade sensitivity.' },
};

export interface ReportContent {
  title: string;
  columns: string[];
  rows: Record<string, string | number | null>[];
  summary: Record<string, string | number>;
}

export interface ReportRecord {
  id: string;
  type: ReportType;
  generatedBy: string | null;
  generatedByName: string | null;
  rowCount: number;
  createdAt: string;
}

export async function listReports(): Promise<{ availableTypes: ReportType[]; history: ReportRecord[] }> {
  const { data } = await apiClient.get('/reports');
  return data;
}

export async function generateReport(type: ReportType): Promise<ReportRecord & { content: ReportContent }> {
  const { data } = await apiClient.post('/reports/generate', { type });
  return data;
}

export async function getReport(id: string): Promise<ReportRecord & { content: ReportContent }> {
  const { data } = await apiClient.get(`/reports/${id}`);
  return data;
}

/** RFC 4180 CSV: every field quoted, inner quotes doubled — safe for commas and line breaks in notes. */
export function toCsv(content: ReportContent): string {
  const quote = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [content.columns.map(quote).join(',')];
  for (const row of content.rows) lines.push(content.columns.map((col) => quote(row[col] ?? null)).join(','));
  return lines.join('\r\n');
}

export function downloadCsv(content: ReportContent, createdAt: string) {
  const blob = new Blob(['﻿', toCsv(content)], { type: 'text/csv;charset=utf-8' }); // BOM so Excel reads UTF-8
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${content.title.toLowerCase().replace(/\s+/g, '-')}-${createdAt.slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
