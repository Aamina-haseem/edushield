import type { StudentFeatures } from '../../contracts/types.js';

/** Returns an error message, or null when the password is acceptable. */
export function checkPassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters long.';
  if (password.length > 128) return 'Password must be at most 128 characters long.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain at least one letter and one number.';
  return null;
}

/** Allowed ranges follow the UCI Student Performance codebook (ml-service/data/student.txt). */
const INTEGER_RANGES: Record<Exclude<keyof StudentFeatures, 'sex' | BooleanFeature>, [number, number]> = {
  age: [15, 22],
  studytime: [1, 4],
  failures: [0, 4],
  famrel: [1, 5],
  freetime: [1, 5],
  goout: [1, 5],
  dalc: [1, 5],
  walc: [1, 5],
  health: [1, 5],
  absences: [0, 93],
  medu: [0, 4],
  fedu: [0, 4],
  g1: [0, 20],
  g2: [0, 20],
  g3: [0, 20],
};

type BooleanFeature = 'schoolsup' | 'famsup' | 'paid' | 'activities' | 'higher' | 'internet' | 'romantic';
const BOOLEAN_FEATURES: BooleanFeature[] = ['schoolsup', 'famsup', 'paid', 'activities', 'higher', 'internet', 'romantic'];

export interface NewStudentInput {
  studentNumber: string;
  name: string;
  email: string;
  programme: string;
  yearOfStudy: number;
  advisorId: string | null;
  features: StudentFeatures;
}

/** Validates a POST /students body. Returns the cleaned input, or the list of problems found. */
export function validateNewStudent(body: unknown): { value: NewStudentInput } | { errors: string[] } {
  const errors: string[] = [];
  const input = (body ?? {}) as Record<string, unknown>;
  const features = (input.features ?? {}) as Record<string, unknown>;

  const text = (key: string, max = 120) => {
    const value = input[key];
    if (typeof value !== 'string' || !value.trim()) errors.push(`${key} is required`);
    else if (value.trim().length > max) errors.push(`${key} must be at most ${max} characters`);
    return typeof value === 'string' ? value.trim() : '';
  };

  const studentNumber = text('studentNumber', 32);
  const name = text('name');
  const email = text('email').toLowerCase();
  const programme = text('programme');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email is not a valid address');

  const yearOfStudy = input.yearOfStudy;
  if (!Number.isInteger(yearOfStudy) || (yearOfStudy as number) < 1 || (yearOfStudy as number) > 6) {
    errors.push('yearOfStudy must be an integer from 1 to 6');
  }

  const advisorId = input.advisorId ?? null;
  if (advisorId !== null && typeof advisorId !== 'string') errors.push('advisorId must be a string or null');

  if (features.sex !== 'F' && features.sex !== 'M') errors.push("features.sex must be 'F' or 'M'");
  for (const key of BOOLEAN_FEATURES) {
    if (typeof features[key] !== 'boolean') errors.push(`features.${key} must be true or false`);
  }
  for (const [key, [min, max]] of Object.entries(INTEGER_RANGES)) {
    const value = features[key];
    if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
      errors.push(`features.${key} must be an integer from ${min} to ${max}`);
    }
  }

  if (errors.length) return { errors };
  return {
    value: {
      studentNumber,
      name,
      email,
      programme,
      yearOfStudy: yearOfStudy as number,
      advisorId: advisorId as string | null,
      features: features as unknown as StudentFeatures,
    },
  };
}
