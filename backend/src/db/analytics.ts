import { pool } from './pool.js';
import type { RiskTier } from '../../../contracts/types.js';

export interface AnalyticsSummary {
  totalStudents: number;
  riskDistribution: Record<RiskTier, number>;
  interventionsByStatus: Record<string, number>;
}

/** Aggregate-only — never returns per-student rows, matching contracts/endpoints.md's
 * note that this route must not leak per-student PII beyond what /students already exposes. */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [totalResult, riskResult, interventionResult] = await Promise.all([
    pool.query<{ count: string }>('SELECT COUNT(*) FROM students'),
    pool.query<{ risk_tier: RiskTier; count: string }>(`
      WITH latest_predictions AS (
        SELECT DISTINCT ON (student_id) student_id, risk_tier
        FROM predictions
        ORDER BY student_id, predicted_at DESC
      )
      SELECT risk_tier, COUNT(*) FROM latest_predictions GROUP BY risk_tier
    `),
    pool.query<{ status: string; count: string }>('SELECT status, COUNT(*) FROM interventions GROUP BY status'),
  ]);

  const riskDistribution: Record<RiskTier, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const row of riskResult.rows) riskDistribution[row.risk_tier] = Number(row.count);

  const interventionsByStatus: Record<string, number> = {};
  for (const row of interventionResult.rows) interventionsByStatus[row.status] = Number(row.count);

  return {
    totalStudents: Number(totalResult.rows[0].count),
    riskDistribution,
    interventionsByStatus,
  };
}

export interface TierBreakdown {
  group: string;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export interface AnalyticsOverview {
  byProgramme: TierBreakdown[];
  byYear: TierBreakdown[];
  /** For HIGH/MEDIUM students: how often each feature is their single strongest risk-increasing SHAP factor. */
  topRiskDrivers: { feature: string; students: number }[];
  absenceBands: { band: string; students: number; highRisk: number; averageRiskScore: number }[];
  interventionsByTier: { tier: RiskTier; pending: number; in_progress: number; completed: number }[];
}

const LATEST = `latest AS (
  SELECT DISTINCT ON (student_id) * FROM predictions ORDER BY student_id, predicted_at DESC
)`;
const ABSENCE_BANDS = ['0', '1-5', '6-10', '11-20', '21+'];

function toBreakdown(rows: { grp: string; risk_tier: RiskTier; count: string }[]): TierBreakdown[] {
  const byGroup = new Map<string, TierBreakdown>();
  for (const row of rows) {
    const entry = byGroup.get(row.grp) ?? { group: row.grp, HIGH: 0, MEDIUM: 0, LOW: 0 };
    entry[row.risk_tier] = Number(row.count);
    byGroup.set(row.grp, entry);
  }
  return [...byGroup.values()];
}

/** Aggregate-only, like getAnalyticsSummary: group counts, never per-student rows. */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const [programme, year, drivers, absences, interventions] = await Promise.all([
    pool.query<{ grp: string; risk_tier: RiskTier; count: string }>(`
      WITH ${LATEST}
      SELECT s.programme AS grp, l.risk_tier, COUNT(*) FROM latest l JOIN students s ON s.id = l.student_id
      GROUP BY s.programme, l.risk_tier ORDER BY s.programme`),
    pool.query<{ grp: string; risk_tier: RiskTier; count: string }>(`
      WITH ${LATEST}
      SELECT 'Year ' || s.year_of_study AS grp, l.risk_tier, COUNT(*) FROM latest l JOIN students s ON s.id = l.student_id
      GROUP BY s.year_of_study, l.risk_tier ORDER BY s.year_of_study`),
    pool.query<{ feature: string; students: string }>(`
      WITH ${LATEST}
      SELECT top.f->>'feature' AS feature, COUNT(*) AS students
      FROM latest,
      LATERAL (
        SELECT elem AS f FROM jsonb_array_elements(latest.shap_factors) WITH ORDINALITY AS t(elem, ord)
        WHERE elem->>'direction' = 'increases' ORDER BY ord LIMIT 1
      ) top
      WHERE latest.risk_tier IN ('HIGH', 'MEDIUM')
      GROUP BY feature ORDER BY students DESC LIMIT 8`),
    pool.query<{ band: string; students: string; high_risk: string; average_risk_score: string }>(`
      WITH ${LATEST}
      SELECT CASE WHEN s.absences = 0 THEN '0' WHEN s.absences <= 5 THEN '1-5' WHEN s.absences <= 10 THEN '6-10'
                  WHEN s.absences <= 20 THEN '11-20' ELSE '21+' END AS band,
             COUNT(*) AS students,
             SUM(CASE WHEN l.risk_tier = 'HIGH' THEN 1 ELSE 0 END) AS high_risk,
             ROUND(AVG(l.risk_score), 1) AS average_risk_score
      FROM latest l JOIN students s ON s.id = l.student_id
      GROUP BY band`),
    pool.query<{ tier: RiskTier; status: 'pending' | 'in_progress' | 'completed'; count: string }>(
      'SELECT tier, status, COUNT(*) FROM interventions GROUP BY tier, status'),
  ]);

  const interventionsByTier = (['HIGH', 'MEDIUM', 'LOW'] as RiskTier[]).map((tier) => ({ tier, pending: 0, in_progress: 0, completed: 0 }));
  for (const row of interventions.rows) {
    const entry = interventionsByTier.find((e) => e.tier === row.tier);
    if (entry) entry[row.status] = Number(row.count);
  }

  return {
    byProgramme: toBreakdown(programme.rows),
    byYear: toBreakdown(year.rows),
    topRiskDrivers: drivers.rows.map((r) => ({ feature: r.feature, students: Number(r.students) })),
    absenceBands: ABSENCE_BANDS.flatMap((band) => {
      const row = absences.rows.find((r) => r.band === band);
      return row ? [{ band, students: Number(row.students), highRisk: Number(row.high_risk), averageRiskScore: Number(row.average_risk_score) }] : [];
    }),
    interventionsByTier,
  };
}
