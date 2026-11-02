import { pool } from './pool.js';
import type { AuthUser } from '../../../contracts/types.js';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'advisor' | 'student';
  avatar_initials: string;
  student_id: string | null;
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarInitials: row.avatar_initials,
    studentId: row.student_id,
  };
}

export async function findUserByEmail(email: string): Promise<(AuthUser & { passwordHash: string }) | null> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const row = rows[0];
  if (!row) return null;
  return { ...toAuthUser(row), passwordHash: row.password_hash };
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  const row = rows[0];
  return row ? toAuthUser(row) : null;
}

export async function findPasswordHashById(id: string): Promise<string | null> {
  const { rows } = await pool.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [id]);
  return rows[0]?.password_hash ?? null;
}

export async function updatePasswordHash(id: string, passwordHash: string): Promise<void> {
  await pool.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [id, passwordHash]);
}

export async function listUserIdsByRole(role: AuthUser['role']): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM users WHERE role = $1', [role]);
  return rows.map((r) => r.id);
}

/** The login account linked to a student record, if that student has one. */
export async function findUserIdForStudent(studentId: string): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM users WHERE student_id = $1 LIMIT 1', [studentId]);
  return rows[0]?.id ?? null;
}

export async function findUserNamesByIds(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { rows } = await pool.query<{ id: string; name: string }>('SELECT id, name FROM users WHERE id = ANY($1::uuid[])', [ids]);
  return new Map(rows.map((r) => [r.id, r.name]));
}

// --- password reset tokens (migration 002) ---

export async function createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  // A new request supersedes any earlier unused link for the same account.
  await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [userId]);
  await pool.query(
    'INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [tokenHash, userId, expiresAt],
  );
}

/** Marks a valid (unused, unexpired) token as used and returns its user id — atomically, so
 * the same link cannot be redeemed twice by two concurrent requests. */
export async function consumePasswordResetToken(tokenHash: string): Promise<string | null> {
  const { rows } = await pool.query<{ user_id: string }>(
    `UPDATE password_reset_tokens SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [tokenHash],
  );
  return rows[0]?.user_id ?? null;
}
