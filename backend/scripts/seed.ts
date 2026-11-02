import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';
import { pool } from '../src/db/pool.js';
import { requestPrediction } from '../src/services/mlServiceClient.js';
import { buildRecommendedActions } from '../src/services/interventionEngine.js';
import type { StudentFeatures } from '../../contracts/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../ml-service/data');
const RULES_PATH = path.resolve(__dirname, '../../ml-service/model/intervention_rules.json');
const DEMO_PASSWORD = 'EduShield@2026';

interface RawRow {
  [key: string]: string;
}

function toBool(v: string): boolean {
  return v === 'yes';
}

function loadCsv(filename: string, course: 'mat' | 'por'): RawRow[] {
  const content = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
  const rows: RawRow[] = parse(content, { columns: true, delimiter: ';' });
  return rows.map((row) => ({ ...row, course }));
}

function yearOfStudyFromAge(age: number): number {
  if (age <= 16) return 1;
  if (age === 17) return 2;
  if (age === 18) return 3;
  return 4;
}

async function upsertUser(name: string, email: string, role: 'admin' | 'advisor' | 'student', avatarInitials: string, studentId: string | null) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, avatar_initials, student_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET student_id = EXCLUDED.student_id
     RETURNING id`,
    [name, email, passwordHash, role, avatarInitials, studentId],
  );
  return rows[0].id as string;
}

async function seed() {
  console.log('Seeding admin/advisor users...');
  const adminId = await upsertUser('Sarah Fernando', 'admin@edushield.ai', 'admin', 'SF', null);
  const advisorId = await upsertUser('Dr. Nadeesha Silva', 'advisor@edushield.ai', 'advisor', 'NS', null);

  console.log('Loading UCI Student Performance CSVs...');
  const rows = [...loadCsv('student-mat.csv', 'mat'), ...loadCsv('student-por.csv', 'por')];
  console.log(`Loaded ${rows.length} rows.`);

  const studentIds: string[] = [];

  for (const [index, row] of rows.entries()) {
    const age = Number(row.age);
    const studentNumber = `STU-${String(index + 1).padStart(5, '0')}`;
    const programme = row.course === 'mat' ? 'Mathematics Track' : 'Portuguese Language Track';
    // First 50 students get the demo advisor assigned, for a non-empty advisor-scoped view.
    const advisor = index < 50 ? advisorId : null;

    const { rows: inserted } = await pool.query(
      `INSERT INTO students (
        student_number, name, email, programme, year_of_study, advisor_id,
        age, sex, studytime, failures, schoolsup, famsup, paid, activities, higher, internet, romantic,
        famrel, freetime, goout, dalc, walc, health, absences, medu, fedu, g1, g2, g3
      ) VALUES (
        $1,$2,$3,$4,$5,$6, $7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
      )
      ON CONFLICT (student_number) DO UPDATE SET
        name = EXCLUDED.name, email = EXCLUDED.email, programme = EXCLUDED.programme,
        year_of_study = EXCLUDED.year_of_study, advisor_id = EXCLUDED.advisor_id,
        age = EXCLUDED.age, sex = EXCLUDED.sex, studytime = EXCLUDED.studytime, failures = EXCLUDED.failures,
        schoolsup = EXCLUDED.schoolsup, famsup = EXCLUDED.famsup, paid = EXCLUDED.paid,
        activities = EXCLUDED.activities, higher = EXCLUDED.higher, internet = EXCLUDED.internet,
        romantic = EXCLUDED.romantic, famrel = EXCLUDED.famrel, freetime = EXCLUDED.freetime,
        goout = EXCLUDED.goout, dalc = EXCLUDED.dalc, walc = EXCLUDED.walc, health = EXCLUDED.health,
        absences = EXCLUDED.absences, medu = EXCLUDED.medu, fedu = EXCLUDED.fedu,
        g1 = EXCLUDED.g1, g2 = EXCLUDED.g2, g3 = EXCLUDED.g3, updated_at = now()
      RETURNING id`,
      [
        studentNumber, `Student ${index + 1}`, `student${index + 1}@edushield.ai`, programme,
        yearOfStudyFromAge(age), advisor,
        age, row.sex, Number(row.studytime), Number(row.failures),
        toBool(row.schoolsup), toBool(row.famsup), toBool(row.paid), toBool(row.activities),
        toBool(row.higher), toBool(row.internet), toBool(row.romantic),
        Number(row.famrel), Number(row.freetime), Number(row.goout), Number(row.Dalc), Number(row.Walc),
        Number(row.health), Number(row.absences), Number(row.Medu), Number(row.Fedu),
        Number(row.G1), Number(row.G2), Number(row.G3),
      ],
    );
    studentIds.push(inserted[0].id as string);
  }
  console.log(`Inserted/updated ${studentIds.length} students.`);

  // Link the demo student login to whichever seeded row is genuinely at-risk (failures >= 2
  // or G3 < 10), so logging in as the student demo account shows a non-trivial dashboard.
  const demoRowIndex = rows.findIndex((r) => Number(r.failures) >= 2 || Number(r.G3) < 10);
  const demoStudentId = studentIds[demoRowIndex === -1 ? 0 : demoRowIndex];
  await upsertUser('Demo Student', 'student@edushield.ai', 'student', 'DS', demoStudentId);
  console.log(`Linked student@edushield.ai to student row #${demoRowIndex + 1} (${rows[demoRowIndex]?.course}).`);

  // Seed a handful of real predictions + interventions end-to-end (requires ml-service running
  // on ML_SERVICE_URL). Re-running the full batch for all students is /predictions/run-batch,
  // not repeated here — this is just enough to have non-empty demo data immediately.
  console.log('Seeding sample predictions + interventions via ml-service (first 15 students)...');
  const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));
  let seededPredictions = 0;

  for (let i = 0; i < Math.min(15, studentIds.length); i++) {
    // Re-running the seed must not stack duplicate predictions/interventions on the same student.
    const { rowCount: existingPredictions } = await pool.query('SELECT 1 FROM predictions WHERE student_id = $1 LIMIT 1', [studentIds[i]]);
    if (existingPredictions) continue;

    const row = rows[i];
    const features: StudentFeatures = {
      age: Number(row.age), sex: row.sex as 'F' | 'M', studytime: Number(row.studytime) as StudentFeatures['studytime'],
      failures: Number(row.failures), schoolsup: toBool(row.schoolsup), famsup: toBool(row.famsup),
      paid: toBool(row.paid), activities: toBool(row.activities), higher: toBool(row.higher),
      internet: toBool(row.internet), romantic: toBool(row.romantic),
      famrel: Number(row.famrel) as StudentFeatures['famrel'], freetime: Number(row.freetime) as StudentFeatures['freetime'],
      goout: Number(row.goout) as StudentFeatures['goout'], dalc: Number(row.Dalc) as StudentFeatures['dalc'],
      walc: Number(row.Walc) as StudentFeatures['walc'], health: Number(row.health) as StudentFeatures['health'],
      absences: Number(row.absences), medu: Number(row.Medu) as StudentFeatures['medu'],
      fedu: Number(row.Fedu) as StudentFeatures['fedu'], g1: Number(row.G1), g2: Number(row.G2), g3: Number(row.G3),
    };

    try {
      const mlResult = await requestPrediction(features);
      const { rows: predRows } = await pool.query(
        `INSERT INTO predictions (student_id, model_version, risk_score, risk_tier, confidence_pct, shap_factors)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [studentIds[i], mlResult.modelVersion, mlResult.riskScore, mlResult.riskTier, mlResult.confidencePct, JSON.stringify(mlResult.shapFactors)],
      );
      seededPredictions++;

      if (mlResult.riskTier !== 'LOW') {
        const actions = buildRecommendedActions(mlResult, rules);
        await pool.query(
          `INSERT INTO interventions (student_id, prediction_id, tier, recommended_actions, assigned_advisor_id)
           VALUES ($1,$2,$3,$4,$5)`,
          [studentIds[i], predRows[0].id, mlResult.riskTier, JSON.stringify(actions), advisorId],
        );
      }
    } catch (err) {
      console.warn(`Skipping prediction for student ${i + 1} — ml-service unreachable? ${(err as Error).message}`);
      break;
    }
  }
  console.log(`Seeded ${seededPredictions} predictions.`);

  console.log('Seeding demo notifications for admin...');
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, message)
     SELECT $1::uuid, 'system', 'Model retrained', $2::text
     WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = $1::uuid AND title = 'Model retrained')`,
    [adminId, `Dropout-risk model retrained — accuracy above target.`],
  );

  console.log('Seed complete.');
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
