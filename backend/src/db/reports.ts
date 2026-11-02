import { pool } from './pool.js';

export const REPORT_TYPES = ['student_risk_summary', 'intervention_outcomes', 'model_performance'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

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

const fmtDate = (value: string | Date | null) => (value ? new Date(value).toISOString() : null);

/** Every student's latest prediction — the same view the Students and Predictions pages show. */
export async function buildStudentRiskSummary(): Promise<ReportContent> {
  const { rows } = await pool.query<{
    student_number: string; name: string; programme: string; year_of_study: number;
    risk_score: string; risk_tier: string; top_factor: string | null; model_version: string; predicted_at: Date;
  }>(`
    WITH latest AS (SELECT DISTINCT ON (student_id) * FROM predictions ORDER BY student_id, predicted_at DESC)
    SELECT s.student_number, s.name, s.programme, s.year_of_study, l.risk_score, l.risk_tier, l.model_version, l.predicted_at,
      (SELECT elem->>'feature' FROM jsonb_array_elements(l.shap_factors) WITH ORDINALITY AS t(elem, ord)
        WHERE elem->>'direction' = 'increases' ORDER BY ord LIMIT 1) AS top_factor
    FROM latest l JOIN students s ON s.id = l.student_id
    ORDER BY l.risk_score DESC, s.student_number`);

  const tiers = { HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>;
  for (const r of rows) tiers[r.risk_tier]++;
  return {
    title: 'Student risk summary',
    columns: ['Student number', 'Name', 'Programme', 'Year', 'Risk score (%)', 'Risk tier', 'Top risk factor', 'Model version', 'Predicted at'],
    rows: rows.map((r) => ({
      'Student number': r.student_number,
      Name: r.name,
      Programme: r.programme,
      Year: r.year_of_study,
      'Risk score (%)': Number(r.risk_score),
      'Risk tier': r.risk_tier,
      'Top risk factor': r.top_factor,
      'Model version': r.model_version,
      'Predicted at': fmtDate(r.predicted_at),
    })),
    summary: { 'Students assessed': rows.length, 'High risk': tiers.HIGH, 'Medium risk': tiers.MEDIUM, 'Low risk': tiers.LOW },
  };
}

export async function buildInterventionOutcomes(): Promise<ReportContent> {
  const { rows } = await pool.query<{
    student_number: string; name: string; tier: string; status: string; recommended_actions: string[];
    advisor: string | null; next_meeting_at: Date | null; notes: string | null; created_at: Date; updated_at: Date;
  }>(`
    SELECT s.student_number, s.name, i.tier, i.status, i.recommended_actions, u.name AS advisor,
           i.next_meeting_at, i.notes, i.created_at, i.updated_at
    FROM interventions i
    JOIN students s ON s.id = i.student_id
    LEFT JOIN users u ON u.id = i.assigned_advisor_id
    ORDER BY i.created_at DESC`);

  const byStatus = { pending: 0, in_progress: 0, completed: 0 } as Record<string, number>;
  for (const r of rows) byStatus[r.status]++;
  return {
    title: 'Intervention outcomes',
    columns: ['Student number', 'Name', 'Tier', 'Status', 'Recommended actions', 'Assigned advisor', 'Next meeting', 'Notes', 'Created', 'Last updated'],
    rows: rows.map((r) => ({
      'Student number': r.student_number,
      Name: r.name,
      Tier: r.tier,
      Status: r.status.replace('_', ' '),
      'Recommended actions': r.recommended_actions.join('; '),
      'Assigned advisor': r.advisor,
      'Next meeting': fmtDate(r.next_meeting_at),
      Notes: r.notes,
      Created: fmtDate(r.created_at),
      'Last updated': fmtDate(r.updated_at),
    })),
    summary: { Interventions: rows.length, Pending: byStatus.pending, 'In progress': byStatus.in_progress, Completed: byStatus.completed },
  };
}

export async function saveReport(type: ReportType, generatedBy: string, content: ReportContent): Promise<ReportRecord> {
  const { rows } = await pool.query<{ id: string; created_at: Date }>(
    'INSERT INTO reports (type, generated_by, row_count, content) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
    [type, generatedBy, content.rows.length, JSON.stringify(content)],
  );
  return { id: rows[0].id, type, generatedBy, generatedByName: null, rowCount: content.rows.length, createdAt: fmtDate(rows[0].created_at)! };
}

export async function listReports(limit = 50): Promise<ReportRecord[]> {
  const { rows } = await pool.query<{ id: string; type: ReportType; generated_by: string | null; name: string | null; row_count: number; created_at: Date }>(
    `SELECT r.id, r.type, r.generated_by, u.name, r.row_count, r.created_at
     FROM reports r LEFT JOIN users u ON u.id = r.generated_by
     ORDER BY r.created_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({ id: r.id, type: r.type, generatedBy: r.generated_by, generatedByName: r.name, rowCount: r.row_count, createdAt: fmtDate(r.created_at)! }));
}

export async function getReportContent(id: string): Promise<(ReportRecord & { content: ReportContent }) | null> {
  const { rows } = await pool.query<{ id: string; type: ReportType; generated_by: string | null; name: string | null; row_count: number; created_at: Date; content: ReportContent }>(
    `SELECT r.*, u.name FROM reports r LEFT JOIN users u ON u.id = r.generated_by WHERE r.id = $1`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, type: r.type, generatedBy: r.generated_by, generatedByName: r.name, rowCount: r.row_count, createdAt: fmtDate(r.created_at)!, content: r.content };
}
