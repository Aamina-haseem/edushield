from flask import Blueprint, jsonify, request

from app.model_loader import bundle
from app.predictor import predict

bp = Blueprint('ml', __name__)

REQUIRED_KEYS = {col.lower() for col in bundle.feature_columns}


@bp.get('/health')
def health():
    return jsonify({'status': 'ok', 'modelVersion': bundle.model_version})


@bp.post('/predict')
def predict_route():
    """Internal-only endpoint (contracts/endpoints.md) — called by the Express backend,
    never exposed directly to the frontend. Body: StudentFeatures-shaped JSON."""
    body = request.get_json(silent=True) or {}
    missing = REQUIRED_KEYS - body.keys()
    if missing:
        return jsonify({'error': f"Missing required feature(s): {sorted(missing)}"}), 400

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
