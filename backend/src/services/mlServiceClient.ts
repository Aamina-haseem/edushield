import axios from 'axios';
import { config } from '../config/index.js';
import type { InterventionRule, RiskTier, ShapFactor, StudentFeatures } from '../../../contracts/types.js';

const client = axios.create({ baseURL: config.mlServiceUrl, timeout: 10_000 });

export interface MlPredictionResult {
  modelVersion: string;
  riskScore: number;
  riskTier: RiskTier;
  confidencePct: number;
  shapFactors: ShapFactor[];
}

export async function requestPrediction(features: StudentFeatures): Promise<MlPredictionResult> {
  const { data } = await client.post<MlPredictionResult>('/predict', features);
  return data;
}

type MetricSet = { accuracy: number; precision: number; recall: number; f1: number; roc_auc: number };

export interface ModelInfo {
  modelVersion: string;
  modelType: string;
  labelDefinition?: string;
  evaluation?: string;
  riskTierThresholds?: Record<RiskTier, number>;
  /** Held-out test-split figures. */
  metrics: { accuracy: number; precision?: number; recall?: number; f1: number; auc_roc: number; confusion_matrix: number[][] };
  /** Grouped cross-validation means per candidate model (training split only). */
  cvMetrics?: Record<string, MetricSet>;
  /** Selected model re-evaluated without the term grades. */
  gradeSensitivityCv?: Record<string, MetricSet>;
}

// Both are fixed for the lifetime of the loaded model, so they are fetched once per model
// version: the cache is dropped whenever /health reports a different version (i.e. after a
// retrain and an ml-service restart), so the backend never serves a stale rule table.
let cachedRules: InterventionRule[] | null = null;
let cachedModelInfo: ModelInfo | null = null;
let cachedForVersion: string | null = null;

async function refreshIfModelChanged() {
  try {
    const { data } = await client.get<{ modelVersion: string }>('/health');
    if (data.modelVersion !== cachedForVersion) {
      cachedRules = null;
      cachedModelInfo = null;
      cachedForVersion = data.modelVersion;
    }
  } catch {
    // ml-service unreachable: keep whatever is cached; the caller's own request will fail loudly if needed.
  }
}

export async function getInterventionRules(): Promise<InterventionRule[]> {
  await refreshIfModelChanged();
  if (!cachedRules) {
    const { data } = await client.get<InterventionRule[]>('/intervention-rules');
    cachedRules = data;
  }
  return cachedRules;
}

export async function getModelInfo(): Promise<ModelInfo> {
  await refreshIfModelChanged();
  if (!cachedModelInfo) {
    const { data } = await client.get<ModelInfo>('/model-info');
    cachedModelInfo = data;
  }
  return cachedModelInfo;
}

export async function getMlServiceHealth(): Promise<{ online: boolean; modelVersion: string | null }> {
  try {
    const { data } = await client.get<{ modelVersion: string }>('/health', { timeout: 3_000 });
    return { online: true, modelVersion: data.modelVersion };
  } catch {
    return { online: false, modelVersion: null };
  }
}
