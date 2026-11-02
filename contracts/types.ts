/**
 * EduShield AI — shared data contract.
 *
 * Single source of truth for shapes used across ml-service (Flask), backend (Express),
 * and frontend (React). Nothing here is implementation — it exists so Phase 1 (ML),
 * Phase 2 (backend), and Phase 3 (frontend) all target the same fields instead of
 * discovering mismatches after the fact.
 *
 * Naming resolves the inconsistencies found in the current frontend prototype:
 * `course` vs `programme`, `year` as number vs "Year 3" string, and `risk`/`riskLevel`/
 * `riskScore` used interchangeably are all retired in favour of the single shapes below.
 */

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

/**
 * Raw model-input features — mirrors the UCI Student Performance dataset columns
 * 1:1 (student-mat.csv / student-por.csv). Kept separate from the university-facing
 * identity fields below so the ML pipeline's input never has to guess at app-only
 * concepts like "programme" that don't exist in the source dataset.
 */
export interface StudentFeatures {
  age: number;
  sex: 'F' | 'M';
  studytime: 1 | 2 | 3 | 4; // 1: <2h, 2: 2-5h, 3: 5-10h, 4: >10h weekly
  failures: number; // past class failures (0-3+)
  schoolsup: boolean; // extra educational support
  famsup: boolean; // family educational support
  paid: boolean; // extra paid classes
  activities: boolean; // extra-curricular activities
  higher: boolean; // wants to take higher education
  internet: boolean; // internet access at home
  romantic: boolean; // in a romantic relationship
  famrel: 1 | 2 | 3 | 4 | 5; // quality of family relationships
  freetime: 1 | 2 | 3 | 4 | 5;
  goout: 1 | 2 | 3 | 4 | 5; // going out with friends
  dalc: 1 | 2 | 3 | 4 | 5; // workday alcohol consumption
  walc: 1 | 2 | 3 | 4 | 5; // weekend alcohol consumption
  health: 1 | 2 | 3 | 4 | 5;
  absences: number;
  medu: 0 | 1 | 2 | 3 | 4; // mother's education
  fedu: 0 | 1 | 2 | 3 | 4; // father's education
  g1: number; // first period grade (0-20)
  g2: number; // second period grade (0-20)
  g3: number; // final grade (0-20) — used with `failures` to derive the training label
}

/** University-facing identity wrapper around a student's raw features. */
export interface Student {
  id: string;
  studentNumber: string;
  name: string;
  email: string;
  programme: string;
  yearOfStudy: number;
  advisorId: string | null;
  features: StudentFeatures;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Prediction (ML output, incl. SHAP explanation)
// ---------------------------------------------------------------------------

export type RiskTier = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * One SHAP-derived factor. `contributionPct` is always a positive magnitude;
 * `direction` carries the sign. This is the normalization convention decided in
 * Phase 1 when real SHAP output is produced — raw SHAP values do not arrive as
 * clean percentages, so ml-service must convert (e.g. proportion of the sum of
 * |SHAP value| across all factors for that prediction) before this shape is filled in.
 */
export interface ShapFactor {
  feature: string; // human-readable label, e.g. "Attendance"
  rawFeature: keyof StudentFeatures; // underlying column, e.g. "absences"
  observedValue: string | number; // e.g. "45%" or 3
  contributionPct: number; // 0-100, magnitude only
  direction: 'increases' | 'decreases';
  explanation: string; // one human-readable sentence
}

export interface Prediction {
  id: string;
  studentId: string;
  modelVersion: string; // e.g. "rf-v1.0.0" — identifies which trained artifact produced this
  riskScore: number; // 0-100
  riskTier: RiskTier;
  confidencePct: number; // model's own confidence, 0-100
  shapFactors: ShapFactor[]; // sorted by contributionPct desc
  predictedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Intervention
// ---------------------------------------------------------------------------

export type InterventionStatus = 'pending' | 'in_progress' | 'completed';

export interface Intervention {
  id: string;
  studentId: string;
  predictionId: string | null; // which Prediction triggered/justifies this
  tier: RiskTier;
  recommendedActions: string[]; // e.g. ["Schedule counseling session", "Assign academic mentor"]
  assignedAdvisorId: string | null;
  status: InterventionStatus;
  notes: string | null;
  nextMeetingAt: string | null; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

/**
 * Generic risk-factor → recommendation mapping, seeded in Phase 1 as a plain data
 * file and consumed server-side by the backend's intervention engine. Deliberately
 * NOT per-student — the same rule fires for any student whose SHAP factors match.
 */
export interface InterventionRule {
  tier: RiskTier;
  triggerFeature: keyof StudentFeatures | 'default'; // 'default' = tier-level fallback action
  action: string;
}

// ---------------------------------------------------------------------------
// User / Auth
// ---------------------------------------------------------------------------

/** Admin and Advisor share one full-access dashboard; Student gets a separate, restricted one. */
export type UserRole = 'admin' | 'advisor' | 'student';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
  /** Set only when role === 'student'; links this account to their own Student record.
   *  This is the field the backend uses to enforce row-level access — a student JWT
   *  can only ever resolve data for this studentId, never another student's. */
  studentId: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthTokenPayload {
  sub: string; // AuthUser.id
  role: UserRole;
  studentId: string | null;
  iat: number;
  exp: number;
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export type NotificationType = 'prediction' | 'intervention' | 'system' | 'meeting';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedStudentId: string | null;
}
