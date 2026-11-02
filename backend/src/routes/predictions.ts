import { Router } from 'express';
import { canAccessStudent, requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getStudentById, listStudents } from '../db/students.js';
import { createPrediction, getLatestPredictionForStudent, getPredictionById, listLatestPredictions } from '../db/predictions.js';
import { requestPrediction } from '../services/mlServiceClient.js';
import { notifyBatchComplete, notifyPrediction } from '../services/notifier.js';

export const predictionsRouter = Router();

predictionsRouter.use(requireAuth);

predictionsRouter.get('/', requireRole('admin', 'advisor'), asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  res.json(await listLatestPredictions(limit));
}));

predictionsRouter.get('/:id', asyncHandler(async (req, res) => {
  const prediction = await getPredictionById(req.params.id);
  if (!prediction) return res.status(404).json({ message: 'Prediction not found' });
  if (!canAccessStudent(req.auth!, prediction.studentId)) {
    return res.status(403).json({ message: 'Forbidden — cannot view another student\'s prediction' });
  }
  res.json(prediction);
}));

predictionsRouter.post('/run', requireRole('admin', 'advisor'), asyncHandler(async (req, res) => {
  const { studentId } = req.body as { studentId?: string };
  if (!studentId) return res.status(400).json({ message: 'studentId is required' });

  const student = await getStudentById(studentId);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const previous = await getLatestPredictionForStudent(studentId);
  const mlResult = await requestPrediction(student.features);
  const prediction = await createPrediction({ studentId, ...mlResult });
  await notifyPrediction(student, prediction, previous?.riskTier ?? null);
  res.status(201).json(prediction);
}));

/** Re-scores every student with the currently loaded model (e.g. after a retrain). Per-student
 * notifications are skipped here — a batch would flood advisors — and the admin who ran it gets
 * one summary notification instead. */
predictionsRouter.post('/run-batch', requireRole('admin'), asyncHandler(async (req, res) => {
  const students = await listStudents();
  let count = 0;
  let highRisk = 0;
  const failed: { studentId: string; message: string }[] = [];
  // One bad record (or a transient ml-service error) must not abort the whole batch halfway.
  for (const student of students) {
    try {
      const mlResult = await requestPrediction(student.features);
      await createPrediction({ studentId: student.id, ...mlResult });
      count++;
      if (mlResult.riskTier === 'HIGH') highRisk++;
    } catch (err) {
      failed.push({ studentId: student.id, message: (err as Error).message });
    }
  }
  await notifyBatchComplete(req.auth!.sub, count, failed.length, highRisk);
  res.status(201).json({ count, failedCount: failed.length, highRisk, failed });
}));
