import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { listNotificationsForUser, markNotificationRead } from '../db/notifications.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await listNotificationsForUser(req.auth!.sub));
}));

notificationsRouter.patch('/:id/read', asyncHandler(async (req, res) => {
  const updated = await markNotificationRead(req.params.id, req.auth!.sub);
  if (!updated) return res.status(404).json({ message: 'Notification not found' });
  res.json(updated);
}));
