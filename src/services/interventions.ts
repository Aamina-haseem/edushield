import { apiClient } from '@/services/api-client';
import type { Intervention, InterventionStatus, RiskTier } from '@/types/contract';

export interface InterventionFilters {
  status?: InterventionStatus;
  tier?: RiskTier;
}

export async function listInterventions(filters: InterventionFilters = {}): Promise<Intervention[]> {
  const { data } = await apiClient.get<Intervention[]>('/interventions', { params: filters });
  return data;
}

export async function getIntervention(id: string): Promise<Intervention> {
  const { data } = await apiClient.get<Intervention>(`/interventions/${id}`);
  return data;
}

export async function createIntervention(studentId: string, predictionId: string): Promise<Intervention> {
  const { data } = await apiClient.post<Intervention>('/interventions', { studentId, predictionId });
  return data;
}

export async function updateIntervention(
  id: string,
  patch: Partial<Pick<Intervention, 'status' | 'notes' | 'nextMeetingAt'>>,
): Promise<Intervention> {
  const { data } = await apiClient.patch<Intervention>(`/interventions/${id}`, patch);
  return data;
}
