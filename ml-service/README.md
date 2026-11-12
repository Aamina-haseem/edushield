# ml-service

Flask microservice wrapping the trained dropout-risk model. Internal-only — called by the
Express backend (`backend/`), never exposed directly to the frontend (see `contracts/endpoints.md`).

## Setup

```powershell
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Retrain the model (optional — trained artifacts are already committed under `model/`)

```powershell
jupyter nbconvert --to notebook --execute --inplace notebooks/dropout_model.ipynb
```

Regenerates `model/model.joblib`, `model/scaler.joblib`, `model/encoders.joblib`,
`model/metadata.json`, `model/intervention_rules.json`.

**Current model**: `random_forest-v2.0.0`. On a held-out test split of the combined UCI Student
Performance dataset (1,044 rows, 209 in the test split): accuracy 90.9%, precision 73.7%, recall
91.3%, F1 0.816, AUC-ROC 0.971.

- Label: `G3 < 10` (fails the final grade). `failures`, `G1` and `G2` are inputs; `G3` is not.
- Rows are grouped by student (the maths and Portuguese files share students), so no student
  appears in both training and test data.
- Encoders and scaler are fitted on the training split only.
- Random Forest was chosen over XGBoost by 5-fold grouped cross-validation F1 on the training
  split (0.818 vs 0.797); the test split was used once, for the figures above.
- Without `G2` the cross-validated F1 drops to 0.670, and to 0.459 without any grades — the model
  relies heavily on term grades.

Explanations (`app/explain.py`, mirrored in the notebook) state each factor's observed value and,
separately, whether it raised or lowered this prediction. The wording never infers a value from the
sign of a SHAP contribution, and `contributionPct` is a share of the explanation, not a change in risk.

The rule table has 29 rules: tier defaults, plus factor rules for High and Medium risk that fire only
when the factor is a top-three risk-increasing driver and its observed value meets the rule's
condition. There is no financial-guidance rule: the dataset has no financial attributes.

The v1 model (`xgboost-v1.0.0`, reported at 93.8% accuracy) had label leakage and student overlap
between train and test; its artifacts and notebook are kept in `model/archive/` and
`notebooks/archive/` for reference.

## Run

```powershell
python -m app.main
```

Serves on `http://127.0.0.1:8001`.

- `GET /health` — liveness + loaded model version
- `POST /predict` — body: `PredictionInput`-shaped JSON (see `contracts/types.ts`, lowercase
  keys e.g. `dalc` not `Dalc`; the outcome `g3` is not needed) → `{ modelVersion, riskScore, riskTier,
  confidencePct, shapFactors }`. Anything that is not a JSON object, or a missing, `null`, wrongly
  typed or out-of-range feature, gets a 400 naming the problem.
- `GET /intervention-rules` — the generic rule table from `model/intervention_rules.json`
