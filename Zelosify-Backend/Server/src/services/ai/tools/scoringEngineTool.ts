/**
 * Deterministic Scoring Engine Tool.
 * Calculates final score strictly using the mandatory formula:
 * FinalScore = (0.5 * skillMatchScore) + (0.3 * experienceMatchScore) + (0.2 * locationMatchScore)
 */

export interface ScoringEngineInput {
  skillMatchScore: number;
  experienceMatchScore: number;
  locationMatchScore: number;
}

export interface ScoringEngineOutput {
  skillMatchScore: number;
  experienceMatchScore: number;
  locationMatchScore: number;
  finalScore: number;
}

export function executeScoringEngine(input: ScoringEngineInput): ScoringEngineOutput {
  const skill = Math.max(0, Math.min(1, Number(input.skillMatchScore) || 0));
  const exp = Math.max(0, Math.min(1, Number(input.experienceMatchScore) || 0));
  const loc = Math.max(0, Math.min(1, Number(input.locationMatchScore) || 0));

  const rawFinal = (0.5 * skill) + (0.3 * exp) + (0.2 * loc);
  const finalScore = Number(rawFinal.toFixed(4));

  return {
    skillMatchScore: skill,
    experienceMatchScore: exp,
    locationMatchScore: loc,
    finalScore,
  };
}
