import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getStudentById } from '../db/students.js';
import { getLatestPredictionForStudent } from '../db/predictions.js';
import { listInterventionsForStudent } from '../db/interventions.js';
import { listNotificationsForUser } from '../db/notifications.js';

export const meDashboardRouter = Router();

/** Student-only self-view. Deliberately never accepts a studentId parameter — the student
 * being described is always resolved from the token (req.auth.studentId), never from
 * request input, so there is no way to request another student's dashboard by ID. */
meDashboardRouter.get('/', requireAuth, requireRole('student'), asyncHandler(async (req, res) => {
  const { studentId } = req.auth!;
  if (!studentId) return res.status(400).json({ message: 'This account is not linked to a student record' });

  const [student, latestPrediction, interventions, notifications] = await Promise.all([
    getStudentById(studentId),
    getLatestPredictionForStudent(studentId),
    listInterventionsForStudent(studentId),
    listNotificationsForUser(req.auth!.sub),
  ]);

  if (!student) return res.status(404).json({ message: 'Linked student record not found' });

  res.json({ student, latestPrediction, interventions, notifications });
}));
