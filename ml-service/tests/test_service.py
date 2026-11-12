"""ml-service tests — run from ml-service/ with:  python -m unittest discover -s tests -v

Exercise the real trained artifacts in model/ through the Flask test client, so a retrain that
breaks the API contract (contracts/types.ts) fails here before it reaches the backend.
"""
import os
import sys
import unittest
import warnings

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
warnings.filterwarnings('ignore', category=PendingDeprecationWarning)  # shap's own plotting module

from app.main import create_app  # noqa: E402
from app.model_loader import bundle  # noqa: E402

AT_RISK = {
    'age': 18, 'sex': 'F', 'studytime': 2, 'failures': 0, 'schoolsup': True, 'famsup': False, 'paid': False,
    'activities': False, 'higher': True, 'internet': False, 'romantic': False, 'famrel': 4, 'freetime': 3,
    'goout': 4, 'dalc': 1, 'walc': 1, 'health': 3, 'absences': 6, 'medu': 4, 'fedu': 4, 'g1': 5, 'g2': 6, 'g3': 6,
}
STRONG = {**AT_RISK, 'g1': 15, 'g2': 16, 'g3': 16, 'absences': 0}
CONTRACT_KEYS = {'feature', 'rawFeature', 'observedValue', 'contributionPct', 'direction', 'explanation'}


class PredictEndpointTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = create_app().test_client()

    def predict(self, body):
        return self.client.post('/predict', json=body)

    def test_response_matches_the_prediction_contract(self):
        res = self.predict(AT_RISK)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['modelVersion'], bundle.model_version)
        self.assertIn(data['riskTier'], {'HIGH', 'MEDIUM', 'LOW'})
        self.assertTrue(0 <= data['riskScore'] <= 100)
        self.assertTrue(50 <= data['confidencePct'] <= 100)
        self.assertEqual(len(data['shapFactors']), len(bundle.feature_columns))
        for factor in data['shapFactors']:
            self.assertEqual(set(factor), CONTRACT_KEYS)
            self.assertEqual(factor['rawFeature'], factor['rawFeature'].lower())
            self.assertIn(factor['direction'], {'increases', 'decreases'})

    def test_shap_contributions_sum_to_100_and_are_sorted(self):
        factors = self.predict(AT_RISK).get_json()['shapFactors']
        self.assertAlmostEqual(sum(f['contributionPct'] for f in factors), 100, delta=0.5)
        pcts = [f['contributionPct'] for f in factors]
        self.assertEqual(pcts, sorted(pcts, reverse=True))

    def test_tier_follows_the_configured_thresholds(self):
        data = self.predict(AT_RISK).get_json()
        thresholds = bundle.tier_thresholds
        expected = 'HIGH' if data['riskScore'] >= thresholds['HIGH'] else 'MEDIUM' if data['riskScore'] >= thresholds['MEDIUM'] else 'LOW'
        self.assertEqual(data['riskTier'], expected)

    def test_weak_grades_score_higher_than_strong_grades(self):
        weak = self.predict(AT_RISK).get_json()['riskScore']
        strong = self.predict(STRONG).get_json()['riskScore']
        self.assertGreater(weak, strong)
        self.assertEqual(self.predict(STRONG).get_json()['riskTier'], 'LOW')

    def test_missing_feature_is_a_400_naming_it(self):
        body = {k: v for k, v in AT_RISK.items() if k != 'g2'}
        res = self.predict(body)
        self.assertEqual(res.status_code, 400)
        self.assertIn('g2', res.get_json()['error'])

    def test_unknown_category_is_a_400(self):
        res = self.predict({**AT_RISK, 'sex': 'X'})
        self.assertEqual(res.status_code, 400)

    def test_empty_body_is_a_400(self):
        self.assertEqual(self.client.post('/predict', data='not json', content_type='text/plain').status_code, 400)

    def test_malformed_bodies_are_a_controlled_400(self):
        for raw in ('[1, 2]', '"abc"', 'null', '42'):
            res = self.client.post('/predict', data=raw, content_type='application/json')
            self.assertEqual(res.status_code, 400, raw)
        for bad in ({'g1': None}, {'g1': 'x'}, {'g1': 21}, {'g1': 7.5}, {'absences': True}, {'famsup': 'maybe'}):
            res = self.predict({**AT_RISK, **bad})
            self.assertEqual(res.status_code, 400, bad)
            self.assertIn(next(iter(bad)), res.get_json()['error'])

    def test_final_grade_is_not_needed_to_predict(self):
        body = {k: v for k, v in AT_RISK.items() if k != 'g3'}
        self.assertEqual(self.predict(body).status_code, 200)

    def test_explanations_state_the_observed_value_and_never_contradict_it(self):
        cases = [
            {**AT_RISK, 'absences': 0},                                   # zero absences, weak grades
            {**STRONG, 'absences': 30, 'studytime': 4, 'goout': 1},       # many absences, strong grades
            {**AT_RISK, 'studytime': 4, 'goout': 1, 'failures': 3},       # unusual combination
        ]
        contradictions = ('High absence count', 'Consistent attendance', 'Low weekly study time',
                          'Frequent social outings', 'No prior failures is', 'Previous module failures')
        for body in cases:
            for factor in self.predict(body).get_json()['shapFactors']:
                text = factor['explanation']
                for phrase in contradictions:
                    self.assertNotIn(phrase, text)
                if factor['rawFeature'] == 'absences':
                    expected = 'No recorded absences' if body['absences'] == 0 else f"{body['absences']} recorded absences"
                    self.assertTrue(text.startswith(expected), text)
                if factor['rawFeature'] in ('g1', 'g2'):
                    self.assertIn(f"{body[factor['rawFeature']]}/20", text)
                if factor['contributionPct'] >= 1:
                    word = 'higher' if factor['direction'] == 'increases' else 'lower'
                    self.assertIn(f'a {word} risk', text)
                else:
                    self.assertIn('almost no effect', text)


class MetadataEndpointsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = create_app().test_client()

    def test_health_reports_the_loaded_model(self):
        data = self.client.get('/health').get_json()
        self.assertEqual(data, {'status': 'ok', 'modelVersion': bundle.model_version})

    def test_model_info_exposes_test_and_cv_metrics(self):
        data = self.client.get('/model-info').get_json()
        self.assertEqual(data['labelDefinition'], 'dropout_risk = G3 < 10')
        for key in ('accuracy', 'precision', 'recall', 'f1', 'auc_roc', 'confusion_matrix'):
            self.assertIn(key, data['metrics'])
        self.assertIn(data['modelType'], data['cvMetrics'])
        self.assertEqual(sum(sum(row) for row in data['metrics']['confusion_matrix']), 209)

    def test_intervention_rules_use_contract_feature_keys(self):
        rules = self.client.get('/intervention-rules').get_json()
        contract_keys = {c.lower() for c in bundle.feature_columns} | {'default'}
        for rule in rules:
            self.assertIn(rule['triggerFeature'], contract_keys)
            self.assertIn(rule['tier'], {'HIGH', 'MEDIUM', 'LOW'})
            self.assertLessEqual(set(rule.get('condition', {})), {'min', 'max', 'equals'})
        # Grade-triggered tutoring must exist for High as well as Medium risk.
        grade_tiers = {r['tier'] for r in rules if r['triggerFeature'] in ('g1', 'g2')}
        self.assertEqual(grade_tiers, {'HIGH', 'MEDIUM'})


if __name__ == '__main__':
    unittest.main()
