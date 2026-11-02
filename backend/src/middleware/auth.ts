import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { AuthTokenPayload, UserRole } from '../../../contracts/types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing bearer token' });

  try {
    req.auth = jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/** Blocks roles outright. Row-level checks (e.g. "student can only read their own record")
 * happen in the route handler itself using req.auth.studentId — this middleware only
 * enforces the coarse role gate from contracts/endpoints.md. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ message: 'Forbidden for this role' });
    }
    next();
  };
}

/** The row-level enforcement point: admin/advisor can read any student; a student token
 * can only ever resolve its own linked studentId. This is what makes "a student can't see
 * another student's data" actually true, not just hidden in the UI. */
export function canAccessStudent(auth: AuthTokenPayload, studentId: string): boolean {
  if (auth.role === 'admin' || auth.role === 'advisor') return true;
  return auth.role === 'student' && auth.studentId === studentId;
}
