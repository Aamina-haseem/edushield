import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getAnalyticsOverview, getAnalyticsSummary } from '../db/analytics.js';
import { getModelInfo } from '../services/mlServiceClient.js';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth, requireRole('admin', 'advisor'));

analyticsRouter.get('/summary', asyncHandler(async (_req, res) => {
  res.json(await getAnalyticsSummary());
}));

analyticsRouter.get('/overview', asyncHandler(async (_req, res) => {
  res.json(await getAnalyticsOverview());
}));

analyticsRouter.get('/model-info', asyncHandler(async (_req, res) => {
  res.json(await getModelInfo());
}));
