/**
 * EduShield AI — shared data contract.
 *
 * Single source of truth for shapes used across ml-service (Flask), backend (Express),
 * and frontend (React). Nothing here is implementation. Keeping every shape in one file
 * means the model service, the API and the interface all use the same field names, so a
 * mismatch shows up as a type error rather than as a bug found at runtime.
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
  /** Observed final grade (0-20): the outcome the model was trained to anticipate (label G3 < 10),
   *  never a model input. Null until the final grade is actually known. */
  g3: number | null;
}

/** The features sent to the model: everything except the outcome. The model needs g2
 *  (the second-term grade), so it cannot assess a student before the second term. */
export type PredictionInput = Omit<StudentFeatures, 'g3'>;

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
 * `direction` carries the sign. Raw SHAP values are not percentages, so ml-service
 * converts them: each factor's absolute SHAP value is divided by the total of the
 * absolute values across all factors for that prediction, then multiplied by 100.
 * The factors of one prediction therefore add up to 100.
 */
export interface ShapFactor {
  feature: string; // human-readable label, e.g. "Attendance"
  rawFeature: keyof StudentFeatures; // underlying column, e.g. "absences"
  observedValue: string | number; // e.g. "45%" or 3
  contributionPct: number; // 0-100: this factor's share of the explanation, NOT a change in risk in percentage points
  direction: 'increases' | 'decreases';
  explanation: string; // states the observed value, then the direction; never infers the value from the sign
}

export interface Prediction {
  id: string;
  studentId: string;
  modelVersion: string; // e.g. "rf-v1.0.0" — identifies which trained artifact produced this
  riskScore: number; // 0-100
  riskTier: RiskTier;
  confidencePct: number; // probability the model gives its predicted class (max(p, 1 - p)), 0-100; an uncalibrated model score, not a measured confidence
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
 * Generic risk-factor → recommendation mapping. The training notebook writes the table
 * as a plain data file (ml-service/model/intervention_rules.json) and the backend's
 * intervention engine applies it. Deliberately NOT per-student: the same rule fires for
 * any student whose SHAP factors match.
 */
export interface InterventionRule {
  tier: RiskTier;
  triggerFeature: keyof StudentFeatures | 'default'; // 'default' = tier-level fallback action
  action: string;
  /** Optional check on the factor's observed value (ShapFactor.observedValue). A factor rule fires
   *  only when the factor is a top risk-increasing driver AND this condition holds, so the sign
   *  of a SHAP value alone never sends a student to support they do not need. */
  condition?: { min?: number; max?: number; equals?: string };
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
