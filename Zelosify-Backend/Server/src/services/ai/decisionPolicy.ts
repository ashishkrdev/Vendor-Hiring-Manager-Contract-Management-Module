/**
 * Decision Policy based on deterministic score thresholds.
 * - Score >= 0.75: Recommended
 * - 0.5 <= Score < 0.75: Borderline
 * - Score < 0.5: Not Recommended
 */

export type DecisionCategory = "RECOMMENDED" | "BORDERLINE" | "NOT_RECOMMENDED";

export interface DecisionResult {
  recommended: boolean;
  category: DecisionCategory;
  score: number;
  confidence: number;
}

export function evaluateDecisionPolicy(score: number): DecisionResult {
  const normalizedScore = Number(score.toFixed(4));
  let category: DecisionCategory;
  let recommended: boolean;
  let confidence: number;

  if (normalizedScore >= 0.75) {
    category = "RECOMMENDED";
    recommended = true;
    confidence = Math.min(0.98, Number((0.85 + (normalizedScore - 0.75) * 0.5).toFixed(2)));
  } else if (normalizedScore >= 0.50) {
    category = "BORDERLINE";
    recommended = false;
    confidence = Number((0.65 + (normalizedScore - 0.50) * 0.4).toFixed(2));
  } else {
    category = "NOT_RECOMMENDED";
    recommended = false;
    confidence = Number((0.80 + (0.50 - normalizedScore) * 0.3).toFixed(2));
  }

  return {
    recommended,
    category,
    score: normalizedScore,
    confidence,
  };
}
