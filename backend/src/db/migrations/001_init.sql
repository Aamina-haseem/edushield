-- Schema matches contracts/types.ts 1:1. Run via `npm run migrate`.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_number  TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  programme       TEXT NOT NULL,
  year_of_study   INTEGER NOT NULL,
  advisor_id      UUID NULL, -- FK to users added after users table exists
  -- StudentFeatures (contracts/types.ts) — mirrors the UCI dataset columns 1:1
  age             INTEGER NOT NULL,
  sex             TEXT NOT NULL CHECK (sex IN ('F', 'M')),
  studytime       INTEGER NOT NULL,
  failures        INTEGER NOT NULL,
  schoolsup       BOOLEAN NOT NULL,
  famsup          BOOLEAN NOT NULL,
  paid            BOOLEAN NOT NULL,
  activities      BOOLEAN NOT NULL,
  higher          BOOLEAN NOT NULL,
  internet        BOOLEAN NOT NULL,
  romantic        BOOLEAN NOT NULL,
  famrel          INTEGER NOT NULL,
  freetime        INTEGER NOT NULL,
  goout           INTEGER NOT NULL,
  dalc            INTEGER NOT NULL,
  walc            INTEGER NOT NULL,
  health          INTEGER NOT NULL,
  absences        INTEGER NOT NULL,
  medu            INTEGER NOT NULL,
  fedu            INTEGER NOT NULL,
  g1              INTEGER NOT NULL,
  g2              INTEGER NOT NULL,
  g3              INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'advisor', 'student')),
  avatar_initials TEXT NOT NULL,
  -- set only when role = 'student'; the row-level access enforcement point (contracts/endpoints.md)
  student_id      UUID NULL REFERENCES students(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS; guard it so `npm run migrate` can be re-run.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_advisor_id_fkey') THEN
    ALTER TABLE students
      ADD CONSTRAINT students_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  model_version   TEXT NOT NULL,
  risk_score      NUMERIC(5, 1) NOT NULL,
  risk_tier       TEXT NOT NULL CHECK (risk_tier IN ('HIGH', 'MEDIUM', 'LOW')),
  confidence_pct  NUMERIC(5, 1) NOT NULL,
  shap_factors    JSONB NOT NULL,
  predicted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_predictions_student_id ON predictions(student_id);

CREATE TABLE IF NOT EXISTS interventions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  prediction_id       UUID NULL REFERENCES predictions(id) ON DELETE SET NULL,
  tier                TEXT NOT NULL CHECK (tier IN ('HIGH', 'MEDIUM', 'LOW')),
  recommended_actions JSONB NOT NULL, -- string[]
  assigned_advisor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  notes               TEXT NULL,
  next_meeting_at     TIMESTAMPTZ NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interventions_student_id ON interventions(student_id);

CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('prediction', 'intervention', 'system', 'meeting')),
  title               TEXT NOT NULL,
  message             TEXT NOT NULL,
  read                BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  related_student_id  UUID NULL REFERENCES students(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
