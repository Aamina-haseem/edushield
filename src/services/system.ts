import { apiClient } from '@/services/api-client';

export interface SystemStatus {
  api: boolean;
  database: boolean;
  mlService: boolean;
  modelVersion: string | null;
  checkedAt: string;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const { data } = await apiClient.get<SystemStatus>('/system/status');
  return data;
}

export async function rescoreAllStudents(): Promise<{ count: number; failedCount: number; highRisk: number }> {
  // Re-scoring every student takes about a minute, far past the client's default timeout.
  const { data } = await apiClient.post('/predictions/run-batch', undefined, { timeout: 10 * 60_000 });
  return data;
}
