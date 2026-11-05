import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './config/index.js';
import { authRouter, meRouter } from './routes/auth.js';
import { studentsRouter } from './routes/students.js';
import { predictionsRouter } from './routes/predictions.js';
import { interventionsRouter } from './routes/interventions.js';
import { notificationsRouter } from './routes/notifications.js';
import { meDashboardRouter } from './routes/dashboard.js';
import { analyticsRouter } from './routes/analytics.js';
import { reportsRouter } from './routes/reports.js';
import { systemRouter } from './routes/system.js';
import { MlServiceUnavailableError } from './services/mlServiceClient.js';

/** CORS_ORIGIN may list several origins, comma-separated. Outside production, any
 * localhost/127.0.0.1 port is also accepted: Vite moves to 5174, 5175… when 5173 is taken, and
 * a frontend on an unexpected port would otherwise fail with an opaque "Network Error". */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin requests and non-browser clients (curl, tests)
  const configured = config.corsOrigin.split(',').map((o) => o.trim());
  if (configured.includes(origin)) return true;
  return process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function createApp() {
  const app = express();
  app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin)) }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Mounted under /api/v1 to match the frontend's src/services/api-client.ts default
  // VITE_API_BASE_URL (set before this backend existed) — kept as-is rather than changing
  // an already-established frontend convention.
  const api = express.Router();
  api.use('/auth', authRouter);
  // Order matters: the more specific /me/dashboard mount must come before /me so it isn't
  // shadowed by meRouter's own routing (which only matches the exact /me path).
  api.use('/me/dashboard', meDashboardRouter);
  api.use('/me', meRouter);
  api.use('/students', studentsRouter);
  api.use('/predictions', predictionsRouter);
  api.use('/interventions', interventionsRouter);
  api.use('/notifications', notificationsRouter);
  api.use('/analytics', analyticsRouter);
  api.use('/reports', reportsRouter);
  api.use('/system', systemRouter);
  app.use('/api/v1', api);

  // Catches anything asyncHandler forwards via next(err), plus sync throws — without this,
  // an uncaught error in a route reaches Express's default handler in dev mode, but a
  // rejected promise that bypassed asyncHandler would otherwise crash the process (Node
  // terminates on unhandled rejections by default).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof MlServiceUnavailableError) console.warn(`[ml-service] unavailable — ${err.detail}`);
    const clientError = toClientError(err);
    if (clientError) return res.status(clientError.status).json({ message: clientError.message });
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  });

  return app;
}

/** Bad input that only surfaces once it reaches Postgres (or the JSON body parser) is the
 * caller's fault, not a server fault — answer 400 instead of a misleading 500. */
export function toClientError(err: unknown): { status: number; message: string } | null {
  if (err instanceof MlServiceUnavailableError) return { status: err.status, message: err.message };
  if (typeof err !== 'object' || err === null) return null;
  const { code, type } = err as { code?: string; type?: string };
  if (type === 'entity.parse.failed') return { status: 400, message: 'Malformed JSON body' };
  switch (code) {
    case '22P02': return { status: 400, message: 'Invalid identifier or value' }; // e.g. non-UUID id
    case '22007':
    case '22008': return { status: 400, message: 'Invalid date/time value' };
    case '23503': return { status: 400, message: 'Referenced record does not exist' };
    case '23505': return { status: 409, message: 'A record with that value already exists' }; // e.g. duplicate student number
    case '23514': return { status: 400, message: 'Value not allowed for this field' };
    default: return null;
  }
}
