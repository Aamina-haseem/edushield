import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import { isAllowedOrigin, toClientError } from '../src/app.js';
import { createLoginLimiter } from '../src/middleware/rateLimit.js';
import { canAccessStudent } from '../src/middleware/auth.js';

test('database input errors map to client errors, not 500s', () => {
  assert.deepEqual(toClientError({ code: '22P02' }), { status: 400, message: 'Invalid identifier or value' });
  assert.equal(toClientError({ code: '23505' })?.status, 409);
  assert.equal(toClientError({ code: '23514' })?.status, 400);
  assert.equal(toClientError({ type: 'entity.parse.failed' })?.status, 400);
});

test('CORS accepts the frontend on any local dev port, but not other sites', () => {
  assert.equal(isAllowedOrigin('http://localhost:5173'), true);
  assert.equal(isAllowedOrigin('http://localhost:5174'), true);
  assert.equal(isAllowedOrigin('http://127.0.0.1:5173'), true);
  assert.equal(isAllowedOrigin(undefined), true);
  assert.equal(isAllowedOrigin('https://evil.example.com'), false);
  assert.equal(isAllowedOrigin('http://localhost.evil.com'), false);
});

test('unknown errors stay server errors', () => {
  assert.equal(toClientError(new Error('boom')), null);
  assert.equal(toClientError({ code: '57P01' }), null);
  assert.equal(toClientError(null), null);
});

test('row-level access: staff see any student, a student only their own record', () => {
  const base = { iat: 0, exp: 0 };
  assert.equal(canAccessStudent({ ...base, sub: 'a', role: 'admin', studentId: null }, 's1'), true);
  assert.equal(canAccessStudent({ ...base, sub: 'b', role: 'advisor', studentId: null }, 's1'), true);
  assert.equal(canAccessStudent({ ...base, sub: 'c', role: 'student', studentId: 's1' }, 's1'), true);
  assert.equal(canAccessStudent({ ...base, sub: 'c', role: 'student', studentId: 's1' }, 's2'), false);
  assert.equal(canAccessStudent({ ...base, sub: 'd', role: 'student', studentId: null }, 's1'), false);
});

test('the login limiter blocks after repeated failures and resets on success', () => {
  const limiter = createLoginLimiter({ maxFailures: 2, windowMs: 60_000 });
  const req = { ip: '10.0.0.1', body: { email: 'Someone@Example.com' } } as unknown as Request;
  let status = 0;
  const res = { status: (code: number) => { status = code; return res; }, json: () => res, setHeader: () => res } as never;
  let passed = 0;
  const next = () => { passed++; };

  limiter.guard(req, res, next);
  limiter.recordFailure(req);
  limiter.recordFailure(req);
  limiter.guard(req, res, next);
  assert.equal(passed, 1);
  assert.equal(status, 429);

  limiter.recordSuccess(req);
  limiter.guard(req, res, next);
  assert.equal(passed, 2);
});
