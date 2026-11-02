import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecommendedActions } from '../src/services/interventionEngine.js';
import type { InterventionRule, ShapFactor } from '../../contracts/types.js';

const rules: InterventionRule[] = [
  { tier: 'HIGH', triggerFeature: 'default', action: 'Counseling within 48 hours' },
  { tier: 'HIGH', triggerFeature: 'absences', action: 'Attendance review' },
  { tier: 'HIGH', triggerFeature: 'dalc', action: 'Wellbeing referral' },
  { tier: 'MEDIUM', triggerFeature: 'default', action: 'Weekly monitoring' },
  { tier: 'MEDIUM', triggerFeature: 'g2', action: 'Tutoring' },
  { tier: 'LOW', triggerFeature: 'default', action: 'Regular check-ins' },
];

const factor = (rawFeature: ShapFactor['rawFeature'], direction: ShapFactor['direction'] = 'increases'): ShapFactor => ({
  feature: rawFeature, rawFeature, observedValue: 1, contributionPct: 10, direction, explanation: '',
});

test('tier defaults always fire for that tier only', () => {
  const actions = buildRecommendedActions({ riskTier: 'LOW', shapFactors: [factor('absences')] }, rules);
  assert.deepEqual(actions, ['Regular check-ins']);
});

test('a feature rule fires when that feature is a top-3 risk-increasing factor', () => {
  const actions = buildRecommendedActions({ riskTier: 'MEDIUM', shapFactors: [factor('g2'), factor('age')] }, rules);
  assert.deepEqual(actions, ['Weekly monitoring', 'Tutoring']);
});

test('a factor that reduces risk does not trigger its rule', () => {
  const actions = buildRecommendedActions({ riskTier: 'MEDIUM', shapFactors: [factor('g2', 'decreases')] }, rules);
  assert.deepEqual(actions, ['Weekly monitoring']);
});

test('only the top three risk-increasing factors are considered', () => {
  const shapFactors = [factor('age'), factor('goout'), factor('health'), factor('absences')];
  const actions = buildRecommendedActions({ riskTier: 'HIGH', shapFactors }, rules);
  assert.deepEqual(actions, ['Counseling within 48 hours']);
});

test('rule matching ignores case (legacy rule tables used UCI casing such as "Dalc")', () => {
  const legacy: InterventionRule[] = [{ tier: 'HIGH', triggerFeature: 'Dalc' as InterventionRule['triggerFeature'], action: 'Wellbeing referral' }];
  const actions = buildRecommendedActions({ riskTier: 'HIGH', shapFactors: [factor('dalc')] }, legacy);
  assert.deepEqual(actions, ['Wellbeing referral']);
});

test('the same action triggered twice is listed once', () => {
  const duplicateRules: InterventionRule[] = [...rules, { tier: 'HIGH', triggerFeature: 'absences', action: 'Counseling within 48 hours' }];
  const actions = buildRecommendedActions({ riskTier: 'HIGH', shapFactors: [factor('absences')] }, duplicateRules);
  assert.deepEqual(actions, ['Counseling within 48 hours', 'Attendance review']);
});
