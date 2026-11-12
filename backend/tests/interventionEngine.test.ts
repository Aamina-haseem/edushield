import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecommendedActions, meetsCondition } from '../src/services/interventionEngine.js';
import type { InterventionRule, ShapFactor } from '../../contracts/types.js';

const rules: InterventionRule[] = [
  { tier: 'HIGH', triggerFeature: 'default', action: 'Counseling within 48 hours' },
  { tier: 'HIGH', triggerFeature: 'absences', action: 'Attendance review' },
  { tier: 'HIGH', triggerFeature: 'dalc', action: 'Wellbeing referral' },
  { tier: 'MEDIUM', triggerFeature: 'default', action: 'Weekly monitoring' },
  { tier: 'MEDIUM', triggerFeature: 'g2', action: 'Tutoring' },
  { tier: 'LOW', triggerFeature: 'default', action: 'Regular check-ins' },
];

const factor = (
  rawFeature: ShapFactor['rawFeature'],
  direction: ShapFactor['direction'] = 'increases',
  observedValue: ShapFactor['observedValue'] = 1,
): ShapFactor => ({ feature: rawFeature, rawFeature, observedValue, contributionPct: 10, direction, explanation: '' });

test('tier defaults always fire for that tier only', () => {
  const actions = buildRecommendedActions({ riskTier: 'LOW', shapFactors: [factor('absences')] }, rules);
  assert.deepEqual(actions, ['Regular check-ins']);
});

test('a feature rule fires when that feature is a top-3 risk-increasing factor, and says why', () => {
  const actions = buildRecommendedActions({ riskTier: 'MEDIUM', shapFactors: [factor('g2', 'increases', 6), factor('age')] }, rules);
  assert.deepEqual(actions, ['Weekly monitoring', 'Tutoring (linked to g2: 6)']);
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
  const actions = buildRecommendedActions({ riskTier: 'HIGH', shapFactors: [factor('dalc', 'increases', 4)] }, legacy);
  assert.deepEqual(actions, ['Wellbeing referral (linked to dalc: 4)']);
});

test('the same action triggered twice is listed once, with its reasons combined', () => {
  const twice: InterventionRule[] = [
    { tier: 'MEDIUM', triggerFeature: 'g1', action: 'Tutoring' },
    { tier: 'MEDIUM', triggerFeature: 'g2', action: 'Tutoring' },
    { tier: 'HIGH', triggerFeature: 'default', action: 'Counseling within 48 hours' },
    { tier: 'HIGH', triggerFeature: 'absences', action: 'Counseling within 48 hours' },
  ];
  assert.deepEqual(
    buildRecommendedActions({ riskTier: 'MEDIUM', shapFactors: [factor('g2', 'increases', 6), factor('g1', 'increases', 7)] }, twice),
    ['Tutoring (linked to g2: 6, g1: 7)'],
  );
  // An action that is already a tier default is not repeated and needs no extra reason.
  assert.deepEqual(
    buildRecommendedActions({ riskTier: 'HIGH', shapFactors: [factor('absences', 'increases', 12)] }, twice),
    ['Counseling within 48 hours'],
  );
});

test('a rule only fires when the observed value meets its condition (no attendance review for zero absences)', () => {
  const conditional: InterventionRule[] = [
    { tier: 'HIGH', triggerFeature: 'absences', condition: { min: 6 }, action: 'Attendance review' },
    { tier: 'HIGH', triggerFeature: 'g2', condition: { max: 11 }, action: 'Tutoring' },
    { tier: 'HIGH', triggerFeature: 'famsup', condition: { equals: 'no' }, action: 'Family support referral' },
  ];
  const noNeed = [factor('absences', 'increases', 0), factor('g2', 'increases', 15), factor('famsup', 'increases', 'yes')];
  assert.deepEqual(buildRecommendedActions({ riskTier: 'HIGH', shapFactors: noNeed }, conditional), []);
  const needed = [factor('absences', 'increases', 12), factor('g2', 'increases', 8), factor('famsup', 'increases', 'no')];
  assert.deepEqual(buildRecommendedActions({ riskTier: 'HIGH', shapFactors: needed }, conditional), [
    'Attendance review (linked to absences: 12)',
    'Tutoring (linked to g2: 8)',
    'Family support referral (linked to famsup: no)',
  ]);
});

test('conditions compare numbers and yes/no values safely', () => {
  assert.equal(meetsCondition(undefined, 'anything'), true);
  assert.equal(meetsCondition({ min: 6 }, 6), true);
  assert.equal(meetsCondition({ min: 6 }, 5), false);
  assert.equal(meetsCondition({ max: 11 }, '11'), true);
  assert.equal(meetsCondition({ max: 11 }, 'not a number'), false);
  assert.equal(meetsCondition({ equals: 'no' }, 'No'), true);
});
