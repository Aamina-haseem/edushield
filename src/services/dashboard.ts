import { apiClient } from '@/services/api-client';
import type { Intervention, Notification, Prediction, Student } from '@/types/contract';

export interface MeDashboard {
  student: Student;
  latestPrediction: Prediction | null;
  interventions: Intervention[];
  notifications: Notification[];
}

export async function getMeDashboard(): Promise<MeDashboard> {
  const { data } = await apiClient.get<MeDashboard>('/me/dashboard');
  return data;
}

export interface AnalyticsSummary {
  totalStudents: number;
  riskDistribution: Record<'HIGH' | 'MEDIUM' | 'LOW', number>;
  interventionsByStatus: Record<string, number>;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const { data } = await apiClient.get<AnalyticsSummary>('/analytics/summary');
  return data;
}

export interface MetricSet {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
}

export interface ModelInfo {
  modelVersion: string;
  modelType: string;
  labelDefinition?: string | null;
  evaluation?: string | null;
  riskTierThresholds?: Record<'HIGH' | 'MEDIUM' | 'LOW', number> | null;
  /** Held-out test split. */
  metrics: { accuracy: number; precision?: number; recall?: number; f1: number; auc_roc: number; confusion_matrix?: number[][] };
  /** Grouped cross-validation means, per candidate model. */
  cvMetrics?: Record<string, MetricSet>;
  /** The selected model re-evaluated without the term grades. */
  gradeSensitivityCv?: Record<string, MetricSet>;
}

export async function getModelInfo(): Promise<ModelInfo> {
  const { data } = await apiClient.get<ModelInfo>('/analytics/model-info');
  return data;
}

export interface TierBreakdown {
  group: string;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export interface AnalyticsOverview {
  byProgramme: TierBreakdown[];
  byYear: TierBreakdown[];
  topRiskDrivers: { feature: string; students: number }[];
  absenceBands: { band: string; students: number; highRisk: number; averageRiskScore: number }[];
  interventionsByTier: { tier: 'HIGH' | 'MEDIUM' | 'LOW'; pending: number; in_progress: number; completed: number }[];
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const { data } = await apiClient.get<AnalyticsOverview>('/analytics/overview');
  return data;
}
