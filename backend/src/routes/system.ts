import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { pool } from '../db/pool.js';
import { getMlServiceHealth } from '../services/mlServiceClient.js';

export const systemRouter = Router();

/** Live health of each tier, for the "AI online" badge and the Settings page. Never throws:
 * a down dependency is reported as `false`, not as a 500. */
systemRouter.get('/status', requireAuth, asyncHandler(async (_req, res) => {
  const [database, ml] = await Promise.all([
    pool.query('SELECT 1').then(() => true, () => false),
    getMlServiceHealth(),
  ]);
  res.json({ api: true, database, mlService: ml.online, modelVersion: ml.modelVersion, checkedAt: new Date().toISOString() });
}));
