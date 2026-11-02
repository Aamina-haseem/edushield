import { Router } from 'express';
import { canAccessStudent, requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createIntervention,
  findOpenInterventionForPrediction,
  getInterventionById,
  listInterventions,
  updateIntervention,
} from '../db/interventions.js';
import { getPredictionById } from '../db/predictions.js';
import { getStudentById } from '../db/students.js';
import { getInterventionRules } from '../services/mlServiceClient.js';
import { buildRecommendedActions } from '../services/interventionEngine.js';
import { notifyInterventionCreated, notifyMeetingScheduled } from '../services/notifier.js';
import type { InterventionStatus, RiskTier } from '../../../contracts/types.js';

export const interventionsRouter = Router();

const INTERVENTION_STATUSES: InterventionStatus[] = ['pending', 'in_progress', 'completed'];

interventionsRouter.use(requireAuth);

interventionsRouter.get('/', requireRole('admin', 'advisor'), asyncHandler(async (req, res) => {
  const { status, tier, assignedAdvisorId } = req.query as Record<string, string | undefined>;
  const interventions = await listInterventions({
    status: status as InterventionStatus | undefined,
    tier: tier as RiskTier | undefined,
    assignedAdvisorId,
  });
  res.json(interventions);
}));

interventionsRouter.get('/:id', asyncHandler(async (req, res) => {
  const intervention = await getInterventionById(req.params.id);
  if (!intervention) return res.status(404).json({ message: 'Intervention not found' });
  if (!canAccessStudent(req.auth!, intervention.studentId)) {
    return res.status(403).json({ message: 'Forbidden — cannot view another student\'s intervention' });
  }
  res.json(intervention);
}));

interventionsRouter.post('/', requireRole('admin', 'advisor'), asyncHandler(async (req, res) => {
  const { studentId, predictionId, assignedAdvisorId } = req.body as {
    studentId?: string;
    predictionId?: string;
    assignedAdvisorId?: string;
  };
  if (!studentId || !predictionId) {
    return res.status(400).json({ message: 'studentId and predictionId are required' });
  }

  const prediction = await getPredictionById(predictionId);
  if (!prediction || prediction.studentId !== studentId) {
    return res.status(400).json({ message: 'predictionId does not match studentId' });
  }

  const existing = await findOpenInterventionForPrediction(predictionId);
  if (existing) {
    return res.status(409).json({ message: 'An open intervention already exists for this prediction', intervention: existing });
  }

  const student = await getStudentById(studentId);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const rules = await getInterventionRules();
  const recommendedActions = buildRecommendedActions(prediction, rules);

  // Ownership default: an explicit assignee, else the advisor creating it, else the student's own advisor.
  const owner = assignedAdvisorId ?? (req.auth!.role === 'advisor' ? req.auth!.sub : student.advisorId);

  const intervention = await createIntervention({
    studentId,
    predictionId,
    tier: prediction.riskTier,
    recommendedActions,
    assignedAdvisorId: owner ?? null,
  });
  await notifyInterventionCreated(student, intervention, req.auth!.sub);
  res.status(201).json(intervention);
}));

interventionsRouter.patch('/:id', requireRole('admin', 'advisor'), asyncHandler(async (req, res) => {
  const { status, notes, nextMeetingAt } = req.body as {
    status?: InterventionStatus;
    notes?: string | null;
    nextMeetingAt?: string | null;
  };
  if (status !== undefined && !INTERVENTION_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${INTERVENTION_STATUSES.join(', ')}` });
  }
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return res.status(400).json({ message: 'notes must be a string or null' });
  }
  if (nextMeetingAt !== undefined && nextMeetingAt !== null && Number.isNaN(Date.parse(nextMeetingAt))) {
    return res.status(400).json({ message: 'nextMeetingAt must be an ISO 8601 date-time or null' });
  }
  const before = await getInterventionById(req.params.id);
  if (!before) return res.status(404).json({ message: 'Intervention not found' });

  const updated = await updateIntervention(req.params.id, { status, notes, nextMeetingAt });
  if (!updated) return res.status(404).json({ message: 'Intervention not found' });

  // pg returns TIMESTAMPTZ as Date objects, so compare instants rather than references.
  const instant = (value: string | null) => (value ? new Date(value).getTime() : null);
  const meetingChanged = updated.nextMeetingAt !== null && instant(updated.nextMeetingAt) !== instant(before.nextMeetingAt);
  if (meetingChanged) {
    const student = await getStudentById(updated.studentId);
    if (student) await notifyMeetingScheduled(student, updated, req.auth!.sub);
  }
  res.json(updated);
}));
