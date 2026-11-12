import type { InterventionRule, Prediction, ShapFactor } from '../../../contracts/types.js';

/** Whether a factor's observed value satisfies a rule's optional condition. Booleans arrive from
 * the ML service as 'yes'/'no', numbers as numbers. A rule without a condition always matches. */
export function meetsCondition(condition: InterventionRule['condition'], observed: ShapFactor['observedValue']): boolean {
  if (!condition) return true;
  if (condition.equals !== undefined) return String(observed).toLowerCase() === condition.equals.toLowerCase();
  const value = Number(observed);
  if (Number.isNaN(value)) return false;
  if (condition.min !== undefined && value < condition.min) return false;
  if (condition.max !== undefined && value > condition.max) return false;
  return true;
}

/** Generic (tier, triggerFeature, condition) -> action mapping, applied to a specific prediction's
 * tier and top risk-increasing SHAP factors. Never per-student — the same rule fires for any
 * student whose prediction matches (contracts/types.ts InterventionRule doc comment).
 *
 * - Tier defaults always apply to that tier.
 * - A factor rule applies when its feature is among the top three risk-increasing factors AND the
 *   factor's observed value meets the rule's condition, so the sign of a SHAP value alone never
 *   recommends support the student's data does not call for.
 * - Each factor-triggered action says which factor(s) led to it, strongest first, so staff can see
 *   why it appeared.
 * - An action triggered more than once is listed once (its reasons are combined).
 */
export function buildRecommendedActions(
  prediction: Pick<Prediction, 'riskTier' | 'shapFactors'>,
  rules: InterventionRule[],
): string[] {
  const tierRules = rules.filter((rule) => rule.tier === prediction.riskTier);
  const defaults = new Set(tierRules.filter((rule) => rule.triggerFeature === 'default').map((rule) => rule.action));
  const order: string[] = [...defaults];
  const reasons = new Map<string, string[]>();

  // Compared case-insensitively: ShapFactor.rawFeature is the lowercase contract key (e.g. 'g1'),
  // while older rule tables used the raw UCI column casing (e.g. 'G1', 'Dalc').
  const topIncreasing = prediction.shapFactors.filter((factor) => factor.direction === 'increases').slice(0, 3);

  // Factors in order of contribution, so actions and their reasons start with the strongest driver.
  for (const factor of topIncreasing) {
    for (const rule of tierRules) {
      if (rule.triggerFeature === 'default') continue;
      if (factor.rawFeature.toLowerCase() !== rule.triggerFeature.toLowerCase()) continue;
      if (!meetsCondition(rule.condition, factor.observedValue)) continue;
      if (!order.includes(rule.action)) order.push(rule.action);
      if (defaults.has(rule.action)) continue; // already applies to every student in this tier
      const reason = `${factor.feature}: ${factor.observedValue}`;
      const list = reasons.get(rule.action) ?? [];
      if (!list.includes(reason)) list.push(reason);
      reasons.set(rule.action, list);
    }
  }

  return order.map((action) => {
    const why = reasons.get(action);
    return why?.length ? `${action} (linked to ${why.join(', ')})` : action;
  });
}
