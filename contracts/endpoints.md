# EduShield AI — API contract

Companion to [`types.ts`](./types.ts). Every route below is implemented in `backend/src/routes/`
and mounted under `/api/v1` (e.g. `POST /api/v1/auth/login`).

All routes except `/auth/login`, `/auth/forgot-password` and `/auth/reset-password` require a
valid JWT (`Authorization: Bearer <token>`) whose payload matches `AuthTokenPayload`. Role checks
are enforced **server-side** (`requireRole`, `canAccessStudent` in `backend/src/middleware/auth.ts`),
not just hidden in the frontend.

## Auth and account

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | body `LoginCredentials` → `{ token, user: AuthUser }`. 5 failed attempts per IP + email in 15 min → 429 |
| POST | `/auth/logout` | any | stateless JWT: 204, the client discards the token |
| POST | `/auth/change-password` | any | body `{ currentPassword, newPassword }` → 204; 400 if current is wrong or new fails the policy (8+ chars, a letter and a number) |
| POST | `/auth/forgot-password` | public | body `{ email }` → same generic message whether or not the account exists; the one-time link (30 min) is written to the backend log (no mail service configured) |
| POST | `/auth/reset-password` | public | body `{ token, newPassword }` → 204; 400 if the token is unknown, used or expired |
| GET | `/me` | any | the current `AuthUser` |
| GET | `/me/dashboard` | student | own `Student`, latest `Prediction`, `Intervention[]`, `Notification[]` — the student id comes from the token, never from the request |

## Students and predictions

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/students` | admin, advisor | `?q=` (name, number, programme) and `?programme=` filters |
| POST | `/students` | admin | create a student; every feature range-checked (`backend/src/validation.ts`); duplicate number/email → 409 |
| GET | `/students/:id` | admin, advisor, or that student | 403 otherwise — the row-level enforcement point |
| GET | `/students/:id/predictions` | admin, advisor, or self | prediction history, newest first |
| GET | `/students/:id/interventions` | admin, advisor, or self | intervention history, newest first |
| GET | `/predictions` | admin, advisor | latest prediction per student joined with name/programme, `?limit=` (default 50), ordered by risk score |
| GET | `/predictions/:id` | admin, advisor, or self | single `Prediction` incl. `shapFactors` |
| POST | `/predictions/run` | admin, advisor | body `{ studentId }` → calls ml-service, stores and returns a new `Prediction`; notifies staff when the student moves into HIGH |
| POST | `/predictions/run-batch` | admin | re-scores every student; per-student failures are collected, not fatal → `{ count, failedCount, highRisk, failed[] }` |

## Interventions and notifications

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/interventions` | admin, advisor | filters `?status=`, `?tier=`, `?assignedAdvisorId=` |
| GET | `/interventions/:id` | admin, advisor, or self | |
| POST | `/interventions` | admin, advisor | body `{ studentId, predictionId, assignedAdvisorId? }`; actions built from the rule table + the prediction's top SHAP factors; 409 if an open intervention already exists for that prediction; owner defaults to the creating advisor, else the student's advisor |
| PATCH | `/interventions/:id` | admin, advisor | `status` (`pending` · `in_progress` · `completed`), `notes`, `nextMeetingAt` (ISO 8601 or null) — validated; a new meeting time notifies the student and assignee |
| GET | `/notifications` | any | the caller's own notifications |
| PATCH | `/notifications/:id/read` | any (owner only) | |

## Analytics, reports and system

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/analytics/summary` | admin, advisor | totals, risk-tier distribution, interventions by status — aggregates only |
| GET | `/analytics/overview` | admin, advisor | risk tier by programme and year, top SHAP risk drivers, high-risk share by absence band, interventions by tier × status — aggregates only |
| GET | `/analytics/model-info` | admin, advisor | ml-service model metadata: version, label definition, test metrics, CV comparison, grade sensitivity |
| GET | `/reports` | admin, advisor | `{ availableTypes, history }` — last 50 generated reports |
| POST | `/reports/generate` | admin, advisor | body `{ type }` (`student_risk_summary` · `intervention_outcomes` · `model_performance`) → builds from live data, stores a snapshot, returns `{ id, …, content: { title, columns, rows, summary } }` |
| GET | `/reports/:id` | admin, advisor | a stored report with its content (re-download) |
| GET | `/system/status` | any | `{ api, database, mlService, modelVersion, checkedAt }` — never 500s; a down dependency reports `false` |

## Errors

`{ message }` with: 400 bad input (including malformed JSON, non-UUID ids, out-of-range values),
401 missing/invalid token, 403 role or row-level denial, 404 not found, 409 duplicate, 429 too many
failed logins, 503 the ML service is unreachable, timed out or failed (prediction, intervention
rules, model info — the cause is logged server-side), 500 anything unexpected (logged server-side,
no details leaked).

## Internal-only (ml-service, not exposed to the frontend)

| Method | Path | Caller | Notes |
|---|---|---|---|
| POST | `/predict` | backend | body `StudentFeatures` → `{ modelVersion, riskScore, riskTier, confidencePct, shapFactors }`; 400 names any missing or invalid feature |
| GET | `/health` | backend | `{ status, modelVersion }` — also used to drop cached rules/model info after a retrain |
| GET | `/model-info` | backend | metadata written by the training notebook |
| GET | `/intervention-rules` | backend | the generic (tier, triggerFeature) → action table |
