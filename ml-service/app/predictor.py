"""Preprocessing + inference. Mirrors the encode/scale steps fitted in the training
notebook, applied to a single incoming student's features instead of a training batch.
"""
import numpy as np
import pandas as pd

from app.explain import explain
from app.model_loader import bundle

# contracts/types.ts StudentFeatures models these as `boolean`; the trained encoders were
# fit on the raw dataset's 'yes'/'no' strings, so booleans are converted back before encoding.
BOOLEAN_COLUMNS = {'schoolsup', 'famsup', 'paid', 'activities', 'higher', 'internet', 'romantic'}


def _feature_row(features: dict) -> list:
    """Ordered raw values matching bundle.feature_columns. Contract keys are lowercase
    (e.g. 'dalc', 'g1'); model column names mirror the raw UCI headers (e.g. 'Dalc', 'G1') —
    lowercasing the model column name always recovers the contract key."""
    row = []
    for col in bundle.feature_columns:
        value = features[col.lower()]
        if col in BOOLEAN_COLUMNS and isinstance(value, bool):
            value = 'yes' if value else 'no'
        row.append(value)
    return row


def _preprocess(raw_row: list) -> np.ndarray:
    """Applies the LabelEncoder/StandardScaler fitted in the training notebook, in the same column order."""
    encoded = []
    for col, value in zip(bundle.feature_columns, raw_row):
        if col in bundle.categorical_columns:
            encoded.append(bundle.encoders[col].transform([value])[0])
        else:
            encoded.append(value)
    encoded = np.array(encoded, dtype=float)

    numeric_idx = [bundle.feature_columns.index(c) for c in bundle.numeric_columns]
    # The scaler was fit on a named DataFrame in the notebook; passing the same column names
    # avoids sklearn's per-request "X does not have valid feature names" warning.
    numeric_frame = pd.DataFrame([encoded[numeric_idx]], columns=bundle.numeric_columns)
    encoded[numeric_idx] = bundle.scaler.transform(numeric_frame)[0]
    return encoded


def risk_score_and_tier(proba_at_risk: float):
    score = round(float(proba_at_risk) * 100, 1)
    thresholds = bundle.tier_thresholds
    if score >= thresholds['HIGH']:
        tier = 'HIGH'
    elif score >= thresholds['MEDIUM']:
        tier = 'MEDIUM'
    else:
        tier = 'LOW'
    return score, tier


def predict(features: dict) -> dict:
    """features: StudentFeatures-shaped dict (contract key casing). Returns the ml-service
    half of a Prediction: riskScore, riskTier, confidencePct, shapFactors."""
    raw_row = _feature_row(features)
    encoded_row = _preprocess(raw_row)

    # Named columns, as in training — sklearn models otherwise warn on every request.
    model_input = pd.DataFrame([encoded_row], columns=bundle.feature_columns)
    proba_at_risk = bundle.model.predict_proba(model_input)[0, 1]
    score, tier = risk_score_and_tier(proba_at_risk)
    confidence_pct = round(float(max(proba_at_risk, 1 - proba_at_risk)) * 100, 1)

    return {
        'modelVersion': bundle.model_version,
        'riskScore': score,
        'riskTier': tier,
        'confidencePct': confidence_pct,
        'shapFactors': explain(encoded_row, raw_row),
    }
