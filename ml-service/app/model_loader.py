"""Loads the trained model + preprocessing artifacts once at process start.

Artifacts are produced by notebooks/dropout_model.ipynb (Phase 1) and are not
regenerated here — this module only loads what already exists in ml-service/model/.
"""
import json
import os

import joblib

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'model')


class ModelBundle:
    def __init__(self):
        self.model = joblib.load(os.path.join(MODEL_DIR, 'model.joblib'))
        self.scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.joblib'))
        self.encoders = joblib.load(os.path.join(MODEL_DIR, 'encoders.joblib'))

        with open(os.path.join(MODEL_DIR, 'metadata.json')) as f:
            self.metadata = json.load(f)

        with open(os.path.join(MODEL_DIR, 'intervention_rules.json')) as f:
            self.intervention_rules = json.load(f)

        self.feature_columns = self.metadata['featureColumns']
        self.categorical_columns = self.metadata['categoricalColumns']
        self.numeric_columns = self.metadata['numericColumns']
        self.feature_labels = self.metadata['featureLabels']
        self.tier_thresholds = self.metadata['riskTierThresholds']
        self.model_version = self.metadata['modelVersion']


# Loaded once at import time — subsequent requests reuse this instance (no per-request I/O).
bundle = ModelBundle()
