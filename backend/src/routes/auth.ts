import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  findPasswordHashById,
  findUserByEmail,
  findUserById,
  updatePasswordHash,
} from '../db/users.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createLoginLimiter } from '../middleware/rateLimit.js';
import { checkPassword } from '../validation.js';
import type { AuthTokenPayload, LoginCredentials } from '../../../contracts/types.js';

export const authRouter = Router();

const loginLimiter = createLoginLimiter();
const RESET_TOKEN_TTL_MS = 30 * 60_000;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

authRouter.post('/login', loginLimiter.guard, asyncHandler(async (req, res) => {
  const { email, password } = req.body as Partial<LoginCredentials>;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    loginLimiter.recordFailure(req);
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  loginLimiter.recordSuccess(req);

  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    sub: user.id,
    role: user.role,
    studentId: user.studentId,
  };
  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarInitials: user.avatarInitials, studentId: user.studentId },
  });
}));

authRouter.post('/logout', requireAuth, (_req, res) => {
  // Stateless JWT — nothing to invalidate server-side; client discards the token.
  res.status(204).end();
});

authRouter.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword) return res.status(400).json({ message: 'currentPassword is required' });
  const problem = checkPassword(newPassword);
  if (problem) return res.status(400).json({ message: problem });

  const hash = await findPasswordHashById(req.auth!.sub);
  if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  await updatePasswordHash(req.auth!.sub, await bcrypt.hash(newPassword!, 10));
  res.status(204).end();
}));

/**
 * Always answers the same way whether or not the email exists, so the endpoint cannot be used
 * to discover accounts. No mail service is configured in this build: the reset link is written
 * to the backend log, where a developer (or a future mailer) picks it up.
 */
authRouter.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body as { email?: string };
  const genericReply = { message: 'If an account exists for that email, a password-reset link has been sent.' };
  if (!email) return res.status(400).json({ message: 'email is required' });

  const user = await findUserByEmail(email);
  if (user) {
    const token = randomBytes(32).toString('hex');
    await createPasswordResetToken(user.id, sha256(token), new Date(Date.now() + RESET_TOKEN_TTL_MS));
    console.log(`[password-reset] ${user.email}: ${config.appUrl}/reset-password?token=${token} (valid 30 minutes)`);
  }
  res.json(genericReply);
}));

authRouter.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };
  if (!token) return res.status(400).json({ message: 'token is required' });
  const problem = checkPassword(newPassword);
  if (problem) return res.status(400).json({ message: problem });

  const userId = await consumePasswordResetToken(sha256(token));
  if (!userId) return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });
  await updatePasswordHash(userId, await bcrypt.hash(newPassword!, 10));
  res.status(204).end();
}));

export const meRouter = Router();

meRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const user = await findUserById(req.auth!.sub);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}));
