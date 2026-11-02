import { apiClient } from '@/services/api-client';
import type { Intervention, Prediction, Student, StudentFeatures } from '@/types/contract';

export interface NewStudent {
  studentNumber: string;
  name: string;
  email: string;
  programme: string;
  yearOfStudy: number;
  advisorId: string | null;
  features: StudentFeatures;
}

export async function createStudent(student: NewStudent): Promise<Student> {
  const { data } = await apiClient.post<Student>('/students', student);
  return data;
}

export async function listStudents(query?: string): Promise<Student[]> {
  const { data } = await apiClient.get<Student[]>('/students', { params: query ? { q: query } : undefined });
  return data;
}

export async function getStudent(id: string): Promise<Student> {
  const { data } = await apiClient.get<Student>(`/students/${id}`);
  return data;
}

export async function getStudentPredictions(id: string): Promise<Prediction[]> {
  const { data } = await apiClient.get<Prediction[]>(`/students/${id}/predictions`);
  return data;
}

export async function getStudentInterventions(id: string): Promise<Intervention[]> {
  const { data } = await apiClient.get<Intervention[]>(`/students/${id}/interventions`);
  return data;
}
