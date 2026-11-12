import { pool } from './pool.js';
import type { Intervention, InterventionStatus, RiskTier } from '../../../contracts/types.js';

interface InterventionRow {
  id: string;
  student_id: string;
  prediction_id: string | null;
  tier: RiskTier;
  recommended_actions: string[];
  assigned_advisor_id: string | null;
  status: InterventionStatus;
  notes: string | null;
  next_meeting_at: string | null;
  created_at: string;
  updated_at: string;
}

function toIntervention(row: InterventionRow): Intervention {
  return {
    id: row.id,
    studentId: row.student_id,
    predictionId: row.prediction_id,
    tier: row.tier,
    recommendedActions: row.recommended_actions,
    assignedAdvisorId: row.assigned_advisor_id,
    status: row.status,
    notes: row.notes,
    nextMeetingAt: row.next_meeting_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface NewIntervention {
  studentId: string;
  predictionId: string | null;
  tier: RiskTier;
  recommendedActions: string[];
  assignedAdvisorId: string | null;
}

/**
 * Creates the intervention only if no open one exists for the same prediction. The check and the
 * insert run in one transaction holding a per-prediction advisory lock, so two simultaneous
 * requests (e.g. a double click) cannot both pass the check: the second waits, then sees the
 * first one's plan. A lock is used rather than a unique index because the rule is "one *open*
 * plan per prediction", and historical data from before this guard is kept as it was.
 */
export async function createInterventionIfNoneOpen(
  data: NewIntervention & { predictionId: string },
): Promise<{ created: Intervention } | { existing: Intervention }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))', [data.predictionId]);
    const open = await client.query<InterventionRow>(
      `SELECT * FROM interventions WHERE prediction_id = $1 AND status <> 'completed' ORDER BY created_at DESC LIMIT 1`,
      [data.predictionId],
    );
    if (open.rows[0]) {
      await client.query('ROLLBACK');
      return { existing: toIntervention(open.rows[0]) };
    }
    const { rows } = await client.query<InterventionRow>(
      `INSERT INTO interventions (student_id, prediction_id, tier, recommended_actions, assigned_advisor_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.studentId, data.predictionId, data.tier, JSON.stringify(data.recommendedActions), data.assignedAdvisorId],
    );
    await client.query('COMMIT');
    return { created: toIntervention(rows[0]) };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export interface InterventionFilters {
  status?: InterventionStatus;
  tier?: RiskTier;
  assignedAdvisorId?: string;
}

export async function listInterventions(filters: InterventionFilters = {}): Promise<Intervention[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.status) { params.push(filters.status); conditions.push(`status = $${params.length}`); }
  if (filters.tier) { params.push(filters.tier); conditions.push(`tier = $${params.length}`); }
  if (filters.assignedAdvisorId) { params.push(filters.assignedAdvisorId); conditions.push(`assigned_advisor_id = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query<InterventionRow>(`SELECT * FROM interventions ${where} ORDER BY created_at DESC`, params);
  return rows.map(toIntervention);
}

export async function listInterventionsForStudent(studentId: string): Promise<Intervention[]> {
  const { rows } = await pool.query<InterventionRow>(
    'SELECT * FROM interventions WHERE student_id = $1 ORDER BY created_at DESC',
    [studentId],
  );
  return rows.map(toIntervention);
}

export async function getInterventionById(id: string): Promise<Intervention | null> {
  const { rows } = await pool.query<InterventionRow>('SELECT * FROM interventions WHERE id = $1', [id]);
  return rows[0] ? toIntervention(rows[0]) : null;
}

/** An open (not completed) intervention already raised from this prediction, if any — used to
 * stop repeated "Start intervention" clicks from stacking duplicate support plans. */
export async function findOpenInterventionForPrediction(predictionId: string): Promise<Intervention | null> {
  const { rows } = await pool.query<InterventionRow>(
    `SELECT * FROM interventions WHERE prediction_id = $1 AND status <> 'completed' ORDER BY created_at DESC LIMIT 1`,
    [predictionId],
  );
  return rows[0] ? toIntervention(rows[0]) : null;
}

export interface InterventionPatch {
  status?: InterventionStatus;
  notes?: string | null;
  nextMeetingAt?: string | null;
}

export async function updateIntervention(id: string, patch: InterventionPatch): Promise<Intervention | null> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (patch.status !== undefined) { params.push(patch.status); sets.push(`status = $${params.length}`); }
  if (patch.notes !== undefined) { params.push(patch.notes); sets.push(`notes = $${params.length}`); }
  if (patch.nextMeetingAt !== undefined) { params.push(patch.nextMeetingAt); sets.push(`next_meeting_at = $${params.length}`); }
  if (!sets.length) return getInterventionById(id);

  sets.push('updated_at = now()');
  params.push(id);
  const { rows } = await pool.query<InterventionRow>(
    `UPDATE interventions SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0] ? toIntervention(rows[0]) : null;
}
