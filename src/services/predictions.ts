import { apiClient } from '@/services/api-client';
import type { Prediction } from '@/types/contract';

export interface StudentPrediction extends Prediction {
  studentName: string;
  studentNumber: string;
  programme: string;
}

export async function listLatestPredictions(limit = 50): Promise<StudentPrediction[]> {
  const { data } = await apiClient.get<StudentPrediction[]>('/predictions', { params: { limit } });
  return data;
}

export async function getPrediction(id: string): Promise<Prediction> {
  const { data } = await apiClient.get<Prediction>(`/predictions/${id}`);
  return data;
}

export async function runPrediction(studentId: string): Promise<Prediction> {
  const { data } = await apiClient.post<Prediction>('/predictions/run', { studentId });
  return data;
}
