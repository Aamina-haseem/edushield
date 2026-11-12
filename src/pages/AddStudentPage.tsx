import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader, SectionTitle } from '@/components/common/Page';
import type { ApiError } from '@/services/api-client';
import { createStudent, getStudent, updateStudent } from '@/services/students';
import type { Student, StudentFeatures } from '@/types/contract';

/** Field ranges and wording follow the UCI Student Performance codebook (ml-service/data/student.txt);
 * the backend validates the same ranges (backend/src/validation.ts). */
const SCALE_1_5 = 'very low (1) to very high (5)';
type BooleanKey = 'schoolsup' | 'famsup' | 'paid' | 'activities' | 'higher' | 'internet' | 'romantic';
type NumberKey = Exclude<keyof StudentFeatures, 'sex' | 'g3' | BooleanKey>;
const NUMBER_FIELDS: { key: NumberKey; label: string; min: number; max: number; hint: string }[] = [
  { key: 'age', label: 'Age', min: 15, max: 22, hint: '15–22 years' },
  { key: 'studytime', label: 'Weekly study time', min: 1, max: 4, hint: '1 <2h · 2 2–5h · 3 5–10h · 4 >10h' },
  { key: 'failures', label: 'Past class failures', min: 0, max: 4, hint: '0–4' },
  { key: 'absences', label: 'Absences', min: 0, max: 93, hint: '0–93' },
  { key: 'g1', label: 'First-period grade (G1)', min: 0, max: 20, hint: '0–20' },
  { key: 'g2', label: 'Second-period grade (G2)', min: 0, max: 20, hint: '0–20 · required: the model needs the second-term grade, so it cannot assess a student before then' },
  { key: 'famrel', label: 'Family relationship quality', min: 1, max: 5, hint: SCALE_1_5 },
  { key: 'freetime', label: 'Free time after school', min: 1, max: 5, hint: SCALE_1_5 },
  { key: 'goout', label: 'Going out with friends', min: 1, max: 5, hint: SCALE_1_5 },
  { key: 'dalc', label: 'Workday alcohol use', min: 1, max: 5, hint: SCALE_1_5 },
  { key: 'walc', label: 'Weekend alcohol use', min: 1, max: 5, hint: SCALE_1_5 },
  { key: 'health', label: 'Current health status', min: 1, max: 5, hint: 'very bad (1) to very good (5)' },
  { key: 'medu', label: "Mother's education", min: 0, max: 4, hint: '0 none · 1 primary · 2 5th–9th · 3 secondary · 4 higher' },
  { key: 'fedu', label: "Father's education", min: 0, max: 4, hint: '0 none · 1 primary · 2 5th–9th · 3 secondary · 4 higher' },
];
const BOOLEAN_FIELDS: { key: BooleanKey; label: string }[] = [
  { key: 'schoolsup', label: 'Extra educational support' },
  { key: 'famsup', label: 'Family educational support' },
  { key: 'paid', label: 'Extra paid classes' },
  { key: 'activities', label: 'Extra-curricular activities' },
  { key: 'higher', label: 'Wants to take higher education' },
  { key: 'internet', label: 'Internet access at home' },
  { key: 'romantic', label: 'In a romantic relationship' },
];

const DEFAULT_FEATURES: StudentFeatures = {
  age: 17, sex: 'F', studytime: 2, failures: 0, schoolsup: false, famsup: true, paid: false, activities: false,
  higher: true, internet: true, romantic: false, famrel: 4, freetime: 3, goout: 3, dalc: 1, walc: 2, health: 3,
  absences: 0, medu: 2, fedu: 2, g1: 10, g2: 10, g3: null,
};

const inputClass = 'mt-2 w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm font-normal outline-none focus:border-sky-500 dark:border-slate-700';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      {children}
      {hint ? <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span> : null}
    </label>
  );
}

/** Administrator: add a student (route /students/new). */
export function AddStudentPage() {
  return <StudentForm />;
}

/** Staff: edit an existing student's details and model inputs (route /students/:id/edit). */
export function EditStudentPage() {
  const { id } = useParams<{ id: string }>();
  const studentQuery = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id!), enabled: Boolean(id) });

  if (studentQuery.isLoading) return <Card className="p-6 text-sm text-slate-500">Loading student record…</Card>;
  if (studentQuery.isError || !studentQuery.data) {
    return <Card className="p-6 text-sm text-red-600" role="alert">{(studentQuery.error as ApiError | null)?.message ?? 'Student not found.'}</Card>;
  }
  return <StudentForm existing={studentQuery.data} />;
}

function StudentForm({ existing }: { existing?: Student }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [identity, setIdentity] = useState(() => (existing
    ? { studentNumber: existing.studentNumber, name: existing.name, email: existing.email, programme: existing.programme, yearOfStudy: existing.yearOfStudy }
    : { studentNumber: '', name: '', email: '', programme: '', yearOfStudy: 1 }));
  const [features, setFeatures] = useState<StudentFeatures>(() => (existing ? { ...existing.features } : DEFAULT_FEATURES));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setFeature = <K extends keyof StudentFeatures>(key: K, value: StudentFeatures[K]) => setFeatures((current) => ({ ...current, [key]: value }));
  const backTo = existing ? `/students/${existing.id}` : '/students';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const student = existing
        ? await updateStudent(existing.id, { ...identity, advisorId: existing.advisorId, features })
        : await createStudent({ ...identity, advisorId: null, features });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['students'] }),
        queryClient.invalidateQueries({ queryKey: ['student', student.id] }),
      ]);
      navigate(`/students/${student.id}`);
    } catch (err) {
      setError((err as ApiError).message);
      setSaving(false);
    }
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit}>
      <PageHeader
        eyebrow="Student record"
        title={existing ? `Edit ${existing.name}` : 'Add student'}
        description={existing
          ? 'Update details and model inputs, for example a new term grade. Earlier predictions are kept; run a new prediction afterwards to assess the updated record.'
          : "Create a student record. Run a prediction from the student's page once it is saved."}
        actions={<Button type="button" variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(backTo)}>{existing ? 'Back to record' : 'Back to directory'}</Button>}
      />

      <Card className="p-6">
        <SectionTitle title="Identity" description="University-facing details" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Student number"><input className={inputClass} value={identity.studentNumber} onChange={(e) => setIdentity({ ...identity, studentNumber: e.target.value })} required maxLength={32} /></Field>
          <Field label="Full name"><input className={inputClass} value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} required /></Field>
          <Field label="Email"><input className={inputClass} type="email" value={identity.email} onChange={(e) => setIdentity({ ...identity, email: e.target.value })} required /></Field>
          <Field label="Programme"><input className={inputClass} value={identity.programme} onChange={(e) => setIdentity({ ...identity, programme: e.target.value })} required /></Field>
          <Field label="Year of study"><input className={inputClass} type="number" min={1} max={6} value={identity.yearOfStudy} onChange={(e) => setIdentity({ ...identity, yearOfStudy: Number(e.target.value) })} required /></Field>
          <Field label="Sex">
            <select className={inputClass} value={features.sex} onChange={(e) => setFeature('sex', e.target.value as 'F' | 'M')}>
              <option value="F">F</option>
              <option value="M">M</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle title="Model inputs" description="The attributes the risk model uses" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {NUMBER_FIELDS.map(({ key, label, min, max, hint }) => (
            <Field key={key} label={label} hint={hint}>
              <input className={inputClass} type="number" min={min} max={max} step={1} value={features[key]} onChange={(e) => setFeature(key, Number(e.target.value) as StudentFeatures[typeof key])} required />
            </Field>
          ))}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {BOOLEAN_FIELDS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
              <input type="checkbox" className="size-4 accent-[#003152]" checked={features[key]} onChange={(e) => setFeature(key, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle title="Observed outcome" description="Not used to make predictions" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Final grade (G3) — optional" hint="Leave blank until the final grade is actually known. It is recorded for reference only; the model never uses it.">
            <input
              className={inputClass}
              type="number"
              min={0}
              max={20}
              step={1}
              value={features.g3 ?? ''}
              onChange={(e) => setFeature('g3', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
        </div>
      </Card>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" role="alert">{error}</p>}
      <Button type="submit" icon={existing ? <Save size={16} /> : <UserPlus size={16} />} disabled={saving}>
        {saving ? 'Saving…' : existing ? 'Save changes' : 'Save student'}
      </Button>
    </form>
  );
}
