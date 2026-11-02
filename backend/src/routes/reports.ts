import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  buildInterventionOutcomes,
  buildStudentRiskSummary,
  getReportContent,
  listReports,
  REPORT_TYPES,
  saveReport,
  type ReportContent,
  type ReportType,
} from '../db/reports.js';
import { getModelInfo } from '../services/mlServiceClient.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRole('admin', 'advisor'));

const pct = (value: number | undefined) => (value === undefined ? null : Math.round(value * 1000) / 10);

/** Model figures come from ml-service's metadata (the notebook's output), not from the database. */
async function buildModelPerformance(): Promise<ReportContent> {
  const info = await getModelInfo();
  const rows: ReportContent['rows'] = [{
    Model: info.modelType,
    Evaluation: 'Held-out test split (selected model)',
    'Accuracy (%)': pct(info.metrics.accuracy),
    'Precision (%)': pct(info.metrics.precision),
    'Recall (%)': pct(info.metrics.recall),
    'F1 (%)': pct(info.metrics.f1),
    'ROC AUC (%)': pct(info.metrics.auc_roc),
  }];
  for (const [model, m] of Object.entries(info.cvMetrics ?? {})) {
    rows.push({ Model: model, Evaluation: '5-fold grouped CV (training split)', 'Accuracy (%)': pct(m.accuracy), 'Precision (%)': pct(m.precision), 'Recall (%)': pct(m.recall), 'F1 (%)': pct(m.f1), 'ROC AUC (%)': pct(m.roc_auc) });
  }
  for (const [featureSet, m] of Object.entries(info.gradeSensitivityCv ?? {})) {
    rows.push({ Model: `${info.modelType}, ${featureSet}`, Evaluation: 'Grade sensitivity, 5-fold grouped CV', 'Accuracy (%)': pct(m.accuracy), 'Precision (%)': pct(m.precision), 'Recall (%)': pct(m.recall), 'F1 (%)': pct(m.f1), 'ROC AUC (%)': pct(m.roc_auc) });
  }
  const [[tn, fp], [fn, tp]] = info.metrics.confusion_matrix;
  return {
    title: 'Model performance',
    columns: ['Model', 'Evaluation', 'Accuracy (%)', 'Precision (%)', 'Recall (%)', 'F1 (%)', 'ROC AUC (%)'],
    rows,
    summary: {
      'Model version': info.modelVersion,
      Label: info.labelDefinition ?? 'not recorded',
      'Test confusion matrix': `TN ${tn} · FP ${fp} · FN ${fn} · TP ${tp}`,
    },
  };
}

const BUILDERS: Record<ReportType, () => Promise<ReportContent>> = {
  student_risk_summary: buildStudentRiskSummary,
  intervention_outcomes: buildInterventionOutcomes,
  model_performance: buildModelPerformance,
};

reportsRouter.get('/', asyncHandler(async (_req, res) => {
  res.json({ availableTypes: REPORT_TYPES, history: await listReports() });
}));

/** Builds the report from live data, stores the snapshot, and returns it in full. */
reportsRouter.post('/generate', asyncHandler(async (req, res) => {
  const { type } = req.body as { type?: ReportType };
  if (!type || !REPORT_TYPES.includes(type)) {
    return res.status(400).json({ message: `type must be one of: ${REPORT_TYPES.join(', ')}` });
  }
  const content = await BUILDERS[type]();
  const record = await saveReport(type, req.auth!.sub, content);
  res.status(201).json({ ...record, content });
}));

reportsRouter.get('/:id', asyncHandler(async (req, res) => {
  const report = await getReportContent(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.json(report);
}));
