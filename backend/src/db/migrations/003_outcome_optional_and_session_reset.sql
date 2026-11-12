-- The final grade (g3) is the outcome the model anticipates, not a model input, so a student can be
-- added and assessed before it is known. Existing values (observed outcomes) are kept.
ALTER TABLE students ALTER COLUMN g3 DROP NOT NULL;

-- When a password is reset, every token issued before that moment stops working
-- (backend/src/middleware/auth.ts compares the token's iat with this column).
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NULL;
