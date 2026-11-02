import { Router } from 'express';
import { canAccessStudent, requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createStudent, getStudentById, listStudents } from '../db/students.js';
import { listPredictionsForStudent } from '../db/predictions.js';
import { listInterventionsForStudent } from '../db/interventions.js';
import { validateNewStudent } from '../validation.js';

export const studentsRouter = Router();

studentsRouter.use(requireAuth);

studentsRouter.get('/', requireRole('admin', 'advisor'), asyncHandler(async (req, res) => {
  const { q, programme } = req.query;
  const students = await listStudents({
    query: typeof q === 'string' ? q : undefined,
    programme: typeof programme === 'string' ? programme : undefined,
  });
  res.json(students);
}));

/** Admin-only: add a student record. A duplicate student number or email answers 409 (see app.ts). */
studentsRouter.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const result = validateNewStudent(req.body);
  if ('errors' in result) return res.status(400).json({ message: result.errors.join('; '), errors: result.errors });
  res.status(201).json(await createStudent(result.value));
}));

studentsRouter.get('/:id', asyncHandler(async (req, res) => {
  if (!canAccessStudent(req.auth!, req.params.id)) {
    return res.status(403).json({ message: 'Forbidden — cannot view another student\'s record' });
  }
  const student = await getStudentById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  res.json(student);
}));

studentsRouter.get('/:id/predictions', asyncHandler(async (req, res) => {
  if (!canAccessStudent(req.auth!, req.params.id)) {
    return res.status(403).json({ message: 'Forbidden — cannot view another student\'s predictions' });
  }
  res.json(await listPredictionsForStudent(req.params.id));
}));

studentsRouter.get('/:id/interventions', asyncHandler(async (req, res) => {
  if (!canAccessStudent(req.auth!, req.params.id)) {
    return res.status(403).json({ message: 'Forbidden — cannot view another student\'s interventions' });
  }
  res.json(await listInterventionsForStudent(req.params.id));
}));
