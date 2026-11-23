/**
 * Implements deterministic candidate-to-opening matching algorithms.
 */

export interface DeterministicMatchInput {
  candidateExp: number;
  experienceMin: number;
  experienceMax?: number | null;
  candidateSkills: string[];
  requiredSkills: string[];
  candidateLocation: string;
  openingLocation?: string | null;
}

export interface DeterministicMatchOutput {
  experienceMatchScore: number;
  skillMatchScore: number;
  locationMatchScore: number;
}

/**
 * Calculates experience match score according to mandatory criteria:
 * - if candidateExp < min -> 0
 * - if within range (min <= candidateExp <= max) -> 1
 * - if above max -> 0.8
 * - if no max specified and candidateExp >= min -> 1
 */
export function calculateExperienceScore(
  candidateExp: number,
  min: number,
  max?: number | null
): number {
  if (candidateExp < min) {
    return 0;
  }
  if (max !== null && max !== undefined) {
    if (candidateExp > max) {
      return 0.8;
    }
  }
  return 1.0;
}

/**
 * Calculates skill overlap score:
 * overlap / requiredSkills
 */
export function calculateSkillScore(
  candidateSkills: string[],
  requiredSkills: string[]
): number {
  if (!requiredSkills || requiredSkills.length === 0) {
    return 1.0; // No requirements specified
  }

  const normalizedCand = new Set(
    candidateSkills.map((s) => s.trim().toLowerCase())
  );
  let overlapCount = 0;

  for (const req of requiredSkills) {
    if (normalizedCand.has(req.trim().toLowerCase())) {
      overlapCount++;
    }
  }

  const score = overlapCount / requiredSkills.length;
  return Number(score.toFixed(4));
}

/**
 * Calculates location match score:
 * - Remote -> 1 (either opening is Remote or candidate is Remote)
 * - Exact match -> 1
 * - Onsite mismatch -> 0.5
 */
export function calculateLocationScore(
  candidateLocation: string,
  openingLocation?: string | null
): number {
  if (!openingLocation) return 1.0;

  const cand = candidateLocation.trim().toLowerCase();
  const opening = openingLocation.trim().toLowerCase();

  if (cand.includes("remote") || opening.includes("remote")) {
    return 1.0;
  }

  if (cand === opening) {
    return 1.0;
  }

  // Check city or state overlap (e.g. "New York" in both)
  const candTokens = cand.split(/[\s,]+/);
  const openingTokens = opening.split(/[\s,]+/);
  const matches = candTokens.some((t) => t.length > 2 && openingTokens.includes(t));

  if (matches) {
    return 1.0;
  }

  return 0.5; // Onsite mismatch
}

/**
 * Executes full deterministic matching returning all component scores.
 */
export function executeDeterministicMatch(
  input: DeterministicMatchInput
): DeterministicMatchOutput {
  const experienceMatchScore = calculateExperienceScore(
    input.candidateExp,
    input.experienceMin,
    input.experienceMax
  );

  const skillMatchScore = calculateSkillScore(
    input.candidateSkills,
    input.requiredSkills
  );

  const locationMatchScore = calculateLocationScore(
    input.candidateLocation,
    input.openingLocation
  );

  return {
    experienceMatchScore,
    skillMatchScore,
    locationMatchScore,
  };
}
