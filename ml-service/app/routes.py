from flask import Blueprint, jsonify, request

from app.model_loader import bundle
from app.predictor import predict

bp = Blueprint('ml', __name__)

REQUIRED_KEYS = {col.lower() for col in bundle.feature_columns}

# Same ranges as backend/src/validation.ts (UCI Student Performance codebook, ml-service/data/student.txt).
INTEGER_RANGES = {
    'age': (15, 22), 'studytime': (1, 4), 'failures': (0, 4), 'famrel': (1, 5), 'freetime': (1, 5),
    'goout': (1, 5), 'dalc': (1, 5), 'walc': (1, 5), 'health': (1, 5), 'absences': (0, 93),
    'medu': (0, 4), 'fedu': (0, 4), 'g1': (0, 20), 'g2': (0, 20),
}
BOOLEAN_KEYS = {'schoolsup', 'famsup', 'paid', 'activities', 'higher', 'internet', 'romantic'}


def validate_features(body):
    """Returns a list of problems with a /predict body; empty when it can be scored safely.
    Checked before inference so that arrays, strings, nulls and out-of-range values get a
    controlled 400 instead of an uncaught 500 (or, worse, a silently scored null)."""
    if not isinstance(body, dict):
        return ['Body must be a JSON object of student features']
    problems = []
    missing = REQUIRED_KEYS - body.keys()
    if missing:
        problems.append(f"Missing required feature(s): {sorted(missing)}")
    for key, (low, high) in INTEGER_RANGES.items():
        if key in body:
            value = body[key]
            if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
                problems.append(f'{key} must be an integer from {low} to {high}')
    for key in BOOLEAN_KEYS:
        if key in body and not (isinstance(body[key], bool) or body[key] in ('yes', 'no')):
            problems.append(f'{key} must be true or false')
    if 'sex' in body and body['sex'] not in ('F', 'M'):
        problems.append("sex must be 'F' or 'M'")
    return problems


@bp.get('/health')
def health():
    return jsonify({'status': 'ok', 'modelVersion': bundle.model_version})


@bp.post('/predict')
def predict_route():
    """Internal-only endpoint (contracts/endpoints.md) — called by the Express backend,
    never exposed directly to the frontend. Body: StudentFeatures-shaped JSON (the final
    grade g3 is an outcome, not an input, and is ignored if present)."""
    body = request.get_json(silent=True)
    problems = validate_features(body)
    if problems:
        return jsonify({'error': '; '.join(problems)}), 400

    try:
        result = predict(body)
    except (ValueError, KeyError) as exc:
        return jsonify({'error': f'Invalid feature value: {exc}'}), 400

    return jsonify(result)


@bp.get('/model-info')
def model_info():
    meta = bundle.metadata
    return jsonify({
        'modelVersion': bundle.model_version,
        'modelType': meta['modelType'],
        'labelDefinition': meta.get('labelDefinition'),
        'evaluation': meta.get('evaluation'),
        'riskTierThresholds': meta.get('riskTierThresholds'),
        'metrics': meta['metrics'],
        'cvMetrics': meta.get('cvMetrics', {}),
        'gradeSensitivityCv': meta.get('gradeSensitivityCv', {}),
    })


@bp.get('/intervention-rules')
def intervention_rules():
    """Lets the Express backend fetch the rule table once at boot rather than duplicating
    ml-service/model/intervention_rules.json into the Node codebase."""
    return jsonify(bundle.intervention_rules)
