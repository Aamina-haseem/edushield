-- Generated reports are stored as snapshots so they can be listed and downloaded again later
-- (contracts/endpoints.md: GET /reports lists generated report metadata).
CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL CHECK (type IN ('student_risk_summary', 'intervention_outcomes', 'model_performance')),
  generated_by  UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  row_count     INTEGER NOT NULL,
  content       JSONB NOT NULL, -- { columns: string[], rows: object[], summary: object }
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- One-time password-reset tokens. Only a SHA-256 hash of the token is stored, so a database
-- leak does not hand out working reset links.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
