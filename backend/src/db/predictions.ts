import { pool } from './pool.js';
import type { Prediction, RiskTier, ShapFactor } from '../../../contracts/types.js';

interface PredictionRow {
  id: string;
  student_id: string;
  model_version: string;
  risk_score: string;
  risk_tier: RiskTier;
  confidence_pct: string;
  shap_factors: ShapFactor[];
  predicted_at: string;
}

function toPrediction(row: PredictionRow): Prediction {
  return {
    id: row.id,
    studentId: row.student_id,
    modelVersion: row.model_version,
    riskScore: Number(row.risk_score),
    riskTier: row.risk_tier,
    confidencePct: Number(row.confidence_pct),
    shapFactors: row.shap_factors,
    predictedAt: row.predicted_at,
  };
}

export interface NewPrediction {
  studentId: string;
  modelVersion: string;
  riskScore: number;
  riskTier: RiskTier;
  confidencePct: number;
  shapFactors: ShapFactor[];
}

export async function createPrediction(data: NewPrediction): Promise<Prediction> {
  const { rows } = await pool.query<PredictionRow>(
    `INSERT INTO predictions (student_id, model_version, risk_score, risk_tier, confidence_pct, shap_factors)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.studentId, data.modelVersion, data.riskScore, data.riskTier, data.confidencePct, JSON.stringify(data.shapFactors)],
  );
  return toPrediction(rows[0]);
}

export async function getPredictionById(id: string): Promise<Prediction | null> {
  const { rows } = await pool.query<PredictionRow>('SELECT * FROM predictions WHERE id = $1', [id]);
  return rows[0] ? toPrediction(rows[0]) : null;
}

export async function listPredictionsForStudent(studentId: string): Promise<Prediction[]> {
  const { rows } = await pool.query<PredictionRow>(
    'SELECT * FROM predictions WHERE student_id = $1 ORDER BY predicted_at DESC',
    [studentId],
  );
  return rows.map(toPrediction);
}

export async function getLatestPredictionForStudent(studentId: string): Promise<Prediction | null> {
  const [latest] = await listPredictionsForStudent(studentId);
  return latest ?? null;
}

export interface StudentPrediction extends Prediction {
  studentName: string;
  studentNumber: string;
  programme: string;
}

/** One row per student — their most recent prediction, joined with basic identity fields.
 * Powers the admin/advisor dashboard's priority list; not part of the original endpoint
 * sketch in contracts/endpoints.md, added here since a real dashboard needs it. */
export async function listLatestPredictions(limit = 50): Promise<StudentPrediction[]> {
  const { rows } = await pool.query<PredictionRow & { student_name: string; student_number: string; programme: string }>(
    `WITH latest AS (
       SELECT DISTINCT ON (student_id) *
       FROM predictions
       ORDER BY student_id, predicted_at DESC
     )
     SELECT latest.*, s.name AS student_name, s.student_number, s.programme
     FROM latest
     JOIN students s ON s.id = latest.student_id
     ORDER BY latest.risk_score DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map((row) => ({
    ...toPrediction(row),
    studentName: row.student_name,
    studentNumber: row.student_number,
    programme: row.programme,
  }));
}
