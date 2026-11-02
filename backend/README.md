# backend

Express (Node.js) API — auth, role-gating, and orchestration between the frontend and
`ml-service`. See `../contracts/endpoints.md` for the full route list.

## Setup

```powershell
cd backend
npm install
copy .env.example .env
# edit .env: DATABASE_URL must point at a running PostgreSQL instance
npm run migrate
npm run seed   # requires ml-service running on ML_SERVICE_URL for the sample predictions step
```

## Run

```powershell
npm run dev
```

Serves on `http://localhost:8000` by default.

## Test

```powershell
npm run typecheck
npm test        # node:test unit tests in tests/ — no database needed
```

## Environment

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | required |
| `JWT_SECRET` | signs session tokens — use a long random value | required |
| `JWT_EXPIRES_IN` | token lifetime | `8h` |
| `ML_SERVICE_URL` | ml-service base URL | `http://127.0.0.1:8001` |
| `CORS_ORIGIN` | the frontend's origin | `http://localhost:5173` |
| `APP_URL` | frontend URL used in password-reset links | `CORS_ORIGIN` |

## Password reset

No mail service is configured. `POST /auth/forgot-password` writes the one-time reset link to this
server's log (`[password-reset] …`, valid 30 minutes); only a SHA-256 hash of the token is stored.

## Demo accounts (after seeding)

| Role    | Email                  | Password          |
|---------|------------------------|-------------------|
| admin   | admin@edushield.ai     | EduShield@2026    |
| advisor | advisor@edushield.ai   | EduShield@2026    |
| student | student@edushield.ai   | EduShield@2026    |

The student account is linked to a genuinely at-risk seeded record so its dashboard isn't empty.

## Row-level access

A student JWT can only ever resolve `req.auth.studentId` — never another student's ID. This is
enforced in `src/middleware/auth.ts`'s `canAccessStudent` and checked in every route that reads
student-scoped data (`students`, `predictions`, `interventions`). `/me/dashboard` never accepts
a studentId parameter at all — it is always derived from the token.
