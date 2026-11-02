"""SHAP explanation + normalization.

Mirrors notebooks/dropout_model.ipynb's `normalize_shap` cell exactly (the notebook is the
canonical derivation/documentation of this convention; this module is the servable copy).
If the notebook's normalization or templates ever change, update both.
"""
import numpy as np
import shap

from app.model_loader import bundle

_explainer = shap.TreeExplainer(bundle.model)

EXPLANATION_TEMPLATES = {
    'absences': ('High absence count is strongly associated with dropout risk.',
                 'Consistent attendance is acting as a protective factor.'),
    'G1': ('A weak first-term grade is an early warning sign of risk.',
           'A strong first-term grade is acting as a protective factor.'),
    'G2': ('A weak second-term grade is an early warning sign of risk.',
           'A strong second-term grade is acting as a protective factor.'),
    'failures': ('Previous module failures are associated with a higher probability of withdrawal.',
                 'No prior failures is acting as a protective factor.'),
    'studytime': ('Low weekly study time increases risk.', 'Consistent study time is protective.'),
    'goout': ('Frequent social outings correlate with reduced academic focus.',
              'Balanced social activity is not a risk driver here.'),
}

DEFAULT_TEMPLATE = ('This factor is increasing the predicted risk.',
                     'This factor is reducing the predicted risk.')


def normalize_shap(raw_values, feature_row):
    """Raw per-feature SHAP values -> contracts/types.ts ShapFactor[] convention.

    contributionPct(feature) = |shap_value(feature)| / sum(|shap_value(f)| for all f) * 100
    direction = 'increases' if shap_value(feature) > 0 else 'decreases'
    """
    total_abs = np.sum(np.abs(raw_values)) or 1e-9
    factors = []
    for i, col in enumerate(bundle.feature_columns):
        contribution_pct = float(abs(raw_values[i]) / total_abs * 100)
        direction = 'increases' if raw_values[i] > 0 else 'decreases'
        risk_text, protective_text = EXPLANATION_TEMPLATES.get(col, DEFAULT_TEMPLATE)
        factors.append({
            'feature': bundle.feature_labels.get(col, col),
            'rawFeature': col.lower(),  # contracts/types.ts ShapFactor.rawFeature is a StudentFeatures key (lowercase)
            'observedValue': feature_row[i],
            'contributionPct': round(contribution_pct, 2),
            'direction': direction,
            'explanation': risk_text if direction == 'increases' else protective_text,
        })
    factors.sort(key=lambda f: f['contributionPct'], reverse=True)
    return factors


def explain(feature_vector, feature_row):
    """feature_vector: preprocessed (encoded+scaled) 1D array in bundle.feature_columns order.
    feature_row: raw (unencoded) values in the same order, for human-readable observedValue."""
    raw_shap = _explainer.shap_values(feature_vector.reshape(1, -1))
    return normalize_shap(_positive_class(raw_shap), feature_row)


def _positive_class(raw_shap):
    """TreeExplainer's output shape depends on the model and shap version: a per-class list,
    an (n, features, classes) array (Random Forest on recent shap), or an (n, features) array
    for the positive class (XGBoost). Mirrors the notebook's positive_class_shap."""
    if isinstance(raw_shap, list):
        raw_shap = raw_shap[1]
    raw_shap = np.asarray(raw_shap)
    if raw_shap.ndim == 3:
        raw_shap = raw_shap[..., 1]
    return raw_shap[0]
