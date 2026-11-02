import type { InterventionRule, Prediction } from '../../../contracts/types.js';

/** Generic (tier, triggerFeature) -> action mapping, applied to a specific prediction's
 * tier and top risk-increasing SHAP factors. Never per-student — the same rule fires for
 * any student whose prediction matches (contracts/types.ts InterventionRule doc comment). */
export function buildRecommendedActions(
  prediction: Pick<Prediction, 'riskTier' | 'shapFactors'>,
  rules: InterventionRule[],
): string[] {
  const tierRules = rules.filter((rule) => rule.tier === prediction.riskTier);
  const actions = new Set<string>();

  tierRules
    .filter((rule) => rule.triggerFeature === 'default')
    .forEach((rule) => actions.add(rule.action));

  // Compared case-insensitively: ShapFactor.rawFeature is the lowercase contract key (e.g. 'g1'),
  // while the notebook-generated rule table uses the raw UCI column casing (e.g. 'G1', 'Dalc').
  const topIncreasingFeatures = prediction.shapFactors
    .filter((factor) => factor.direction === 'increases')
    .slice(0, 3)
    .map((factor) => factor.rawFeature.toLowerCase());

  tierRules
    .filter((rule) => rule.triggerFeature !== 'default' && topIncreasingFeatures.includes(rule.triggerFeature.toLowerCase()))
    .forEach((rule) => actions.add(rule.action));

  return [...actions];
}
