"""SHAP explanation + normalization.

Mirrors notebooks/dropout_model.ipynb's explanation cell (the notebook is the canonical
derivation/documentation of this convention; this module is the servable copy). If the
notebook's normalization or wording ever changes, update both.

Each explanation states the student's **observed value** and, separately, the **direction**
in which the model's SHAP contribution moves this prediction. The wording never infers a
value from the sign of the contribution (a positive SHAP value for absences does not mean
the student has many absences), and it describes association, not cause.
"""
import numpy as np
import shap

from app.model_loader import bundle

_explainer = shap.TreeExplainer(bundle.model)

SCALE_WORDS = {1: 'very low', 2: 'low', 3: 'moderate', 4: 'high', 5: 'very high'}
QUALITY_WORDS = {1: 'very bad', 2: 'bad', 3: 'fair', 4: 'good', 5: 'very good'}
STUDYTIME_WORDS = {1: 'less than 2 hours a week', 2: '2 to 5 hours a week', 3: '5 to 10 hours a week', 4: 'more than 10 hours a week'}
EDUCATION_WORDS = {0: 'no formal education', 1: 'primary education (4th grade)', 2: '5th to 9th grade',
                   3: 'secondary education', 4: 'higher education'}
YES_NO_PHRASES = {
    'schoolsup': ('Receives extra educational support', 'No extra educational support'),
    'famsup': ('Has family educational support', 'No family educational support'),
    'paid': ('Takes extra paid classes', 'No extra paid classes'),
    'activities': ('Takes part in extra-curricular activities', 'No extra-curricular activities'),
    'higher': ('Wants to take higher education', 'Does not plan to take higher education'),
    'internet': ('Has internet access at home', 'No internet access at home'),
    'romantic': ('In a romantic relationship', 'Not in a romantic relationship'),
}
SCALE_LABELS = {'freetime': 'Free time after school', 'goout': 'Going out with friends',
                'Dalc': 'Workday alcohol use', 'Walc': 'Weekend alcohol use'}
GRADE_LABELS = {'G1': 'First-term grade', 'G2': 'Second-term grade'}

# Below this share of the explanation a factor has practically no effect on the prediction.
NEGLIGIBLE_PCT = 1.0


def _as_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def describe_value(col, value):
    """A plain statement of the student's observed value for one model column."""
    number = _as_int(value)
    if col in YES_NO_PHRASES:
        yes_text, no_text = YES_NO_PHRASES[col]
        return yes_text if str(value).lower() in ('yes', 'true', '1') else no_text
    if col == 'sex':
        return {'F': 'Recorded gender: female', 'M': 'Recorded gender: male'}.get(str(value), f'Recorded gender: {value}')
    if number is None:
        return f"{bundle.feature_labels.get(col, col)}: {value}"
    if col == 'age':
        return f'Age {number}'
    if col == 'absences':
        return 'No recorded absences' if number == 0 else f"{number} recorded absence{'s' if number != 1 else ''}"
    if col == 'failures':
        return 'No past class failures' if number == 0 else f"{number} past class failure{'s' if number != 1 else ''}"
    if col == 'studytime':
        return f"Weekly study time: {STUDYTIME_WORDS.get(number, number)}"
    if col in GRADE_LABELS:
        note = ' (below the pass mark of 10)' if number < 10 else ' (a strong grade)' if number >= 14 else ''
        return f'{GRADE_LABELS[col]}: {number}/20{note}'
    if col in SCALE_LABELS:
        return f"{SCALE_LABELS[col]}: {SCALE_WORDS.get(number, number)} ({number}/5)"
    if col == 'health':
        return f"Current health: {QUALITY_WORDS.get(number, number)} ({number}/5)"
    if col == 'famrel':
        return f"Family relationship quality: {QUALITY_WORDS.get(number, number)} ({number}/5)"
    if col in ('Medu', 'Fedu'):
        parent = "Mother's" if col == 'Medu' else "Father's"
        return f"{parent} education: {EDUCATION_WORDS.get(number, number)}"
    return f"{bundle.feature_labels.get(col, col)}: {value}"


def explain_factor(col, value, direction, contribution_pct):
    """Observed value first, then the direction of this factor's effect on this one prediction."""
    statement = describe_value(col, value)
    if contribution_pct < NEGLIGIBLE_PCT:
        return f'{statement}. This has almost no effect on this prediction.'
    effect = 'higher' if direction == 'increases' else 'lower'
    text = f'{statement}. In this prediction, the model links this to a {effect} risk.'
    number = _as_int(value)
    if direction == 'increases' and col in GRADE_LABELS and number is not None and number < 10:
        text += ' A weak term grade is an early warning sign.'
    return text


def normalize_shap(raw_values, feature_row):
    """Raw per-feature SHAP values -> contracts/types.ts ShapFactor[] convention.

    contributionPct(feature) = |shap_value(feature)| / sum(|shap_value(f)| for all f) * 100
    (a share of this explanation, not a change in risk in percentage points)
    direction = 'increases' if shap_value(feature) > 0 else 'decreases'
    """
    total_abs = np.sum(np.abs(raw_values)) or 1e-9
    factors = []
    for i, col in enumerate(bundle.feature_columns):
        contribution_pct = float(abs(raw_values[i]) / total_abs * 100)
        direction = 'increases' if raw_values[i] > 0 else 'decreases'
        factors.append({
            'feature': bundle.feature_labels.get(col, col),
            'rawFeature': col.lower(),  # contracts/types.ts ShapFactor.rawFeature is a StudentFeatures key (lowercase)
            'observedValue': feature_row[i],
            'contributionPct': round(contribution_pct, 2),
            'direction': direction,
            'explanation': explain_factor(col, feature_row[i], direction, contribution_pct),
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
