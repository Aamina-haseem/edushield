import { pool } from './pool.js';
import type { Student, StudentFeatures } from '../../../contracts/types.js';
import type { NewStudentInput } from '../validation.js';

interface StudentRow {
  id: string;
  student_number: string;
  name: string;
  email: string;
  programme: string;
  year_of_study: number;
  advisor_id: string | null;
  age: number;
  sex: 'F' | 'M';
  studytime: number;
  failures: number;
  schoolsup: boolean;
  famsup: boolean;
  paid: boolean;
  activities: boolean;
  higher: boolean;
  internet: boolean;
  romantic: boolean;
  famrel: number;
  freetime: number;
  goout: number;
  dalc: number;
  walc: number;
  health: number;
  absences: number;
  medu: number;
  fedu: number;
  g1: number;
  g2: number;
  g3: number | null;
  created_at: string;
  updated_at: string;
}

const FEATURE_COLUMNS = [
  'age', 'sex', 'studytime', 'failures', 'schoolsup', 'famsup', 'paid', 'activities',
  'higher', 'internet', 'romantic', 'famrel', 'freetime', 'goout', 'dalc', 'walc',
  'health', 'absences', 'medu', 'fedu', 'g1', 'g2', 'g3',
] as const;

function toStudent(row: StudentRow): Student {
  const features = Object.fromEntries(
    FEATURE_COLUMNS.map((col) => [col, row[col]]),
  ) as unknown as StudentFeatures;

  return {
    id: row.id,
    studentNumber: row.student_number,
    name: row.name,
    email: row.email,
    programme: row.programme,
    yearOfStudy: row.year_of_study,
    advisorId: row.advisor_id,
    features,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface StudentFilters {
  query?: string;
  advisorId?: string;
  programme?: string;
}

export async function listStudents(filters: StudentFilters = {}): Promise<Student[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.query) {
    params.push(`%${filters.query.toLowerCase()}%`);
    conditions.push(`(lower(name) LIKE $${params.length} OR lower(student_number) LIKE $${params.length} OR lower(programme) LIKE $${params.length})`);
  }
  if (filters.advisorId) {
    params.push(filters.advisorId);
    conditions.push(`advisor_id = $${params.length}`);
  }
  if (filters.programme) {
    params.push(filters.programme);
    conditions.push(`programme = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query<StudentRow>(`SELECT * FROM students ${where} ORDER BY name`, params);
  return rows.map(toStudent);
}

export async function getStudentById(id: string): Promise<Student | null> {
  const { rows } = await pool.query<StudentRow>('SELECT * FROM students WHERE id = $1', [id]);
  const row = rows[0];
  return row ? toStudent(row) : null;
}

export async function createStudent(input: NewStudentInput): Promise<Student> {
  const columns = ['student_number', 'name', 'email', 'programme', 'year_of_study', 'advisor_id', ...FEATURE_COLUMNS];
  const values = [
    input.studentNumber, input.name, input.email, input.programme, input.yearOfStudy, input.advisorId,
    ...FEATURE_COLUMNS.map((col) => input.features[col]),
  ];
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await pool.query<StudentRow>(
    `INSERT INTO students (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values,
  );
  return toStudent(rows[0]);
}

/** Replaces a student's identity fields and model inputs. Earlier predictions are kept untouched:
 * each stored prediction records the observed value of every factor it used (ShapFactor.observedValue),
 * so a past assessment stays interpretable after the record changes. Returns null if no such student. */
export async function updateStudent(id: string, input: NewStudentInput): Promise<Student | null> {
  const columns = ['student_number', 'name', 'email', 'programme', 'year_of_study', 'advisor_id', ...FEATURE_COLUMNS];
  const values = [
    input.studentNumber, input.name, input.email, input.programme, input.yearOfStudy, input.advisorId,
    ...FEATURE_COLUMNS.map((col) => input.features[col]),
  ];
  const assignments = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
  const { rows } = await pool.query<StudentRow>(
    `UPDATE students SET ${assignments}, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, ...values],
  );
  return rows[0] ? toStudent(rows[0]) : null;
}
